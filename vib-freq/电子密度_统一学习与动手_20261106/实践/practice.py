"""Small, repeatable evening exercises in the existing WSL qc environment."""
from pathlib import Path
import argparse
import csv
import importlib
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('action', choices=['check', 'xtb-summary', 'pyscf', 'compare', 'latest'])
parser.add_argument('--out', required=True)
parser.add_argument('--basis', default='def2-svp')
args = parser.parse_args()
out = Path(args.out).resolve()
out.mkdir(parents=True, exist_ok=True)

def save(name, data):
    (out / name).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(data, ensure_ascii=False, indent=2), flush=True)

if args.action == 'latest':
    for kind in ['check', 'xtb', 'pyscf', 'compare']:
        runs = sorted(out.glob(kind + '_*'))
        print(kind, str(runs[-1]) if runs else 'NOT RUN YET')
    raise SystemExit()

if args.action == 'check':
    record = {'python': sys.executable, 'platform': platform.platform(), 'imports': {}}
    for name in ['numpy', 'pyscf', 'psi4', 'rdkit', 'matplotlib']:
        mod = importlib.import_module(name)
        record['imports'][name] = {'status': 'PASS', 'version': str(getattr(mod, '__version__', 'imported'))}
        print('PASS import', name, flush=True)
    r = subprocess.run(['xtb', '--version'], capture_output=True, text=True, timeout=30)
    if r.returncode:
        raise RuntimeError('xtb --version failed')
    record['xtb_version_output'] = (r.stdout + r.stderr).strip()
    from pyscf import gto, scf, lib
    lib.num_threads(2)
    mol = gto.M(atom='H 0 0 0; H 0 0 0.74', basis='sto-3g', verbose=0)
    mf = scf.RHF(mol)
    energy = float(mf.kernel())
    if not mf.converged or abs(energy + 1.1167593074) > 1e-6:
        raise RuntimeError('H2 reference calculation failed')
    record.update(status='PASS', h2_hf_sto3g_energy=energy, threads=2)
    save('environment.json', record)
    raise SystemExit()

if args.action == 'xtb-summary':
    text = (out / 'xtb.out').read_text(errors='replace')
    matches = re.findall(r'TOTAL ENERGY\s+(-?\d+\.\d+)', text)
    record = {'software': 'GFN2-xTB', 'charge': 0, 'unpaired_electrons': 0,
              'optimized_xyz_exists': (out / 'xtbopt.xyz').is_file(),
              'vibspectrum_exists': (out / 'vibspectrum').is_file(),
              'energy_hartree': float(matches[-1]) if matches else None}
    record['status'] = 'PASS' if record['optimized_xyz_exists'] and record['vibspectrum_exists'] else 'FAIL'
    save('result.json', record)
    raise SystemExit(0 if record['status'] == 'PASS' else 1)

import numpy as np
from pyscf import gto, dft, scf, lib
lib.num_threads(2)
xyz = (HERE / 'inputs/water.xyz').read_text(encoding='utf-8').splitlines()
geometry = '\n'.join(xyz[2:])
shutil.copyfile(HERE / 'inputs/water.xyz', out / 'geometry.xyz')

if args.action == 'compare':
    rows = []
    for basis in ['sto-3g', 'def2-svp']:
        mol = gto.M(atom=geometry, unit='Angstrom', basis=basis, charge=0, spin=0,
                    output=str(out / (basis + '.out')), verbose=4)
        mf = scf.RHF(mol)
        mf.conv_tol = 1e-10
        energy = float(mf.kernel())
        if not mf.converged:
            raise RuntimeError(f'{basis}: SCF did not converge')
        count = float(np.einsum('ij,ji', mf.make_rdm1(), mf.get_ovlp()))
        rows.append({'method': 'RHF', 'basis': basis, 'ao_functions': mol.nao_nr(),
                     'energy_hartree': energy, 'electron_count': count})
    with (out / 'basis_comparison.csv').open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    if any(abs(r['electron_count'] - 10) > 1e-6 for r in rows):
        raise RuntimeError('Electron count failed')
    save('result.json', {'status': 'PASS', 'fixed_geometry': True, 'results': rows})
    raise SystemExit()

from pyscf.tools import cubegen, molden
start = time.time()
mol = gto.M(atom=geometry, unit='Angstrom', basis=args.basis, charge=0, spin=0,
            output=str(out / 'pyscf.out'), verbose=4)
mf = dft.RKS(mol)
mf.xc = 'pbe'
mf.grids.level = 3
mf.conv_tol = 1e-9
mf.max_memory = 1800
trace = []
def callback(env):
    row = {'cycle': int(env.get('cycle', 0)) + 1, 'energy_hartree': float(env['e_tot'])}
    trace.append(row)
    print('SCF', row, flush=True)
mf.callback = callback
energy = float(mf.kernel())
if not mf.converged:
    raise RuntimeError('SCF did not converge: inspect pyscf.out')
dm, overlap = mf.make_rdm1(), mf.get_ovlp()
electrons = float(np.einsum('ij,ji', dm, overlap))
if abs(electrons - 10) > 1e-6:
    raise RuntimeError('Tr(P S) is inconsistent with 10 electrons')
np.save(out / 'density_matrix.npy', dm)
np.save(out / 'overlap_matrix.npy', overlap)
molden.from_scf(mf, str(out / 'wavefunction.molden'))
grid = cubegen.Cube(mol, nx=64, ny=64, nz=64, margin=4.0)
coords = grid.get_coords()
values = []
for begin in range(0, len(coords), 8192):
    ao = dft.numint.eval_ao(mol, coords[begin:begin+8192])
    values.append(dft.numint.eval_rho(mol, ao, dm))
rho = np.concatenate(values).reshape((64, 64, 64))
if not np.isfinite(rho).all():
    raise RuntimeError('Nonfinite density array')
grid.write(rho, str(out / 'density.cube'), comment='PBE density; electron / Bohr^3; teaching exercise')
steps = grid.box / 63
dv = abs(float(np.linalg.det(steps)))
weights = np.ones(64); weights[[0, -1]] = 0.5
grid_count = float(np.einsum('i,j,k,ijk->', weights, weights, weights, rho) * dv)
xyzgrid = coords.reshape(64, 64, 64, 3) * lib.param.BOHR
xindex = int(np.argmin(np.abs(xyzgrid[:, 0, 0, 0])))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
fig, ax = plt.subplots(figsize=(6.2, 4.5), constrained_layout=True)
plot = ax.pcolormesh(xyzgrid[xindex, :, :, 1], xyzgrid[xindex, :, :, 2],
                     np.log10(np.maximum(rho[xindex], 1e-8)), shading='auto', cmap='viridis')
fig.colorbar(plot, ax=ax, label='log10 density [electron / Bohr^3]')
atomcoords = mol.atom_coords() * lib.param.BOHR
ax.scatter(atomcoords[:, 1], atomcoords[:, 2], c=['white', '#f2bc52', '#f2bc52'], edgecolors='black', s=45)
ax.set(xlabel='y [Angstrom]', ylabel='z [Angstrom]', title=f'Water PBE/{args.basis}: x={xyzgrid[xindex,0,0,0]:.3f} Angstrom')
ax.set_aspect('equal')
fig.savefig(out / 'density_slice.png', dpi=170)
plt.close(fig)
save('scf_trace.json', trace)
save('result.json', {'status': 'PASS', 'software': 'PySCF', 'method': 'PBE', 'basis': args.basis,
    'charge': 0, 'spin': 0, 'converged': True, 'ao_functions': mol.nao_nr(),
    'energy_hartree': energy, 'electron_count_from_density_matrix': electrons,
    'expected_electrons': 10, 'export_grid': [64, 64, 64], 'grid_unit': 'electron/Bohr^3',
    'finite_grid_electron_integral': grid_count,
    'grid_integral_note': 'Diagnostic only: finite box and uniform-grid quadrature differ from AO trace.',
    'elapsed_seconds': time.time() - start})
