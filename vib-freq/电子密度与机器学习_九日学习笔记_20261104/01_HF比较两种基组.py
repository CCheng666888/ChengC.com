"""水分子固定几何的 RHF 基组比较；在已安装 PySCF 的环境中运行。"""
from pyscf import gto, scf, lib
import csv
import platform
import pyscf

lib.num_threads(2)
geometry = "O 0 0 0; H 0 -0.75716 0.58626; H 0 0.75716 0.58626"
rows = []
print("Python", platform.python_version(), "PySCF", pyscf.__version__)
for basis in ("sto-3g", "cc-pvdz"):
    mol = gto.M(atom=geometry, basis=basis, unit="Angstrom",
                charge=0, spin=0, verbose=0)
    mf = scf.RHF(mol)
    mf.conv_tol = 1e-10
    energy = mf.kernel()
    if not mf.converged:
        raise RuntimeError(f"{basis}: SCF 未收敛，不应直接比较结果")
    # 密度矩阵在非正交 AO 基中：电子数 = Tr(D S)，不能直接 Tr(D)。
    electrons = (mf.make_rdm1() * mf.get_ovlp().T).sum()
    row = dict(basis=basis, nao=mol.nao_nr(),
               energy_hartree=float(energy), electrons=float(electrons))
    rows.append(row)
    print(row)
with open("hf_basis_results.csv", "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)
