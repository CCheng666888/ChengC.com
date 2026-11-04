"""冻结几何、同方法、同基组空间、同网格的 AB-A-B 差分密度。"""
from pathlib import Path
import numpy as np
from pyscf import gto, dft, lib
from pyscf.tools import cubegen

lib.num_threads(2)
out = Path("water_dimer_results")
out.mkdir(exist_ok=True)
# 教学构型，未优化。A 中一条 O-H 键指向 B 的氧；O···O = 2.9 Å。
atoms = [("O", (0, 0, 0)), ("H", (0.9572, 0, 0)),
         ("H", (-0.23999, 0.92730, 0)),
         ("O", (2.9, 0, 0)), ("H", (3.486, 0.757, 0)),
         ("H", (3.486, -0.757, 0))]

def molecule(real_indices):
    # ghost 原子只保留基函数，无核电荷与电子，统一三次计算的 AO 空间。
    spec = [(symbol if i in real_indices else "ghost-"+symbol, pos)
            for i, (symbol, pos) in enumerate(atoms)]
    return gto.M(atom=spec, basis="cc-pvdz", unit="Angstrom",
                 charge=0, spin=0, verbose=0)

AB = molecule(set(range(6)))
A = molecule({0, 1, 2})
B = molecule({3, 4, 5})
grid = cubegen.Cube(AB, nx=64, ny=64, nz=64, margin=4.0)
coords = grid.get_coords()
shape = (grid.nx, grid.ny, grid.nz)

def solve(mol):
    mf = dft.RKS(mol)
    mf.xc = "pbe"
    mf.grids.level = 3
    mf.conv_tol = 1e-9
    energy = mf.kernel()
    if not mf.converged:
        raise RuntimeError("SCF 未收敛")
    dm = mf.make_rdm1()
    values = []
    for begin in range(0, len(coords), 8192):
        ao = dft.numint.eval_ao(mol, coords[begin:begin+8192])
        values.append(dft.numint.eval_rho(mol, ao, dm, xctype="LDA"))
    return energy, np.concatenate(values).reshape(shape)

eAB, rAB = solve(AB)
eA, rA = solve(A)
eB, rB = solve(B)
delta = rAB-rA-rB
grid.write(rAB, str(out / "dimer_density.cube"), comment="AB density, e/Bohr^3")
grid.write(delta, str(out / "delta_density.cube"), comment="rho_AB-rho_A-rho_B, e/Bohr^3")
np.save(out / "delta_density.npy", delta)
step = grid.box / (np.array(shape)[:, None]-1)
weights = []
for n in shape:
    w = np.ones(n)
    w[[0, -1]] = 0.5
    weights.append(w)
integral = np.einsum("i,j,k,ijk->", *weights, delta)*abs(np.linalg.det(step))
print("integral(delta rho), should approach 0:", integral)
print("frozen-geometry CP interaction energy (Hartree):", eAB-eA-eB)
print("This is a PBE teaching calculation, not a dispersion benchmark.")
