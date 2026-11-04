"""LDA / PBE / B3LYP：相同几何、基组、输出网格；不做几何优化。"""
from pathlib import Path
import csv
import numpy as np
from pyscf import gto, dft, lib
from pyscf.tools import cubegen

lib.num_threads(2)
out = Path("water_density_results")
out.mkdir(exist_ok=True)
mol = gto.M(atom="O 0 0 0; H 0 -0.75716 0.58626; H 0 0.75716 0.58626",
            basis="cc-pvdz", unit="Angstrom", charge=0, spin=0, verbose=0)
# Cube 的内部坐标及 box 使用 Bohr；输出密度使用 electron / Bohr^3。
grid = cubegen.Cube(mol, nx=64, ny=64, nz=64, margin=4.0)
coords = grid.get_coords()
shape = (grid.nx, grid.ny, grid.nz)
step = grid.box / (np.array(shape)[:, None] - 1)
dv = abs(np.linalg.det(step))
weights = []
for n in shape:
    w = np.ones(n)
    w[[0, -1]] = 0.5
    weights.append(w)

def density_on_grid(molecule, dm):
    parts = []
    for begin in range(0, len(coords), 8192):
        ao = dft.numint.eval_ao(molecule, coords[begin:begin+8192])
        parts.append(dft.numint.eval_rho(molecule, ao, dm, xctype="LDA"))
    return np.concatenate(parts).reshape(shape)

rows = []
for label, xc in [("LDA_SVWN", "lda,vwn"), ("PBE", "pbe"), ("B3LYP", "b3lyp")]:
    mf = dft.RKS(mol)
    mf.xc = xc
    mf.grids.level = 3   # DFT 积分网格；与导出 cube 的均匀网格不同。
    mf.conv_tol = 1e-9
    energy = mf.kernel()
    if not mf.converged:
        raise RuntimeError(f"{label}: SCF 未收敛")
    rho = density_on_grid(mol, mf.make_rdm1())
    grid.write(rho, str(out / f"water_{label}.cube"), comment=f"density {xc}, e/Bohr^3")
    count = np.einsum("i,j,k,ijk->", *weights, rho) * dv
    rows.append(dict(method=label, xc=xc, energy_hartree=float(energy),
                     grid_electrons=float(count), expected_electrons=mol.nelectron))
    print(rows[-1])
with (out / "summary.csv").open("w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)
# 网格积分仅是近似检查。若与 10 相差明显，增大盒子并加密网格再比较。
