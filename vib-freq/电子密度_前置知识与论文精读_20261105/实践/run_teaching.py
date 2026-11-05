"""Small, executed teaching calculations. These are not paper reproductions."""
from pathlib import Path
import json, time, platform
import numpy as np
import pyscf
from pyscf import gto, scf, dft, lib

OUT = Path(__file__).resolve().parent
OUT.mkdir(parents=True, exist_ok=True)
lib.num_threads(4)
water = 'O 0 0 0; H 0 -0.757 0.587; H 0 0.757 0.587'
axis = np.linspace(-3.5, 3.5, 161)
y, z = np.meshgrid(axis, axis, indexing='ij')
coords = np.column_stack([np.zeros(y.size), y.ravel(), z.ravel()]) / lib.param.BOHR
results=[]; arrays={'axis_angstrom': axis}
for label, basis, xc in [('HF_STO3G','sto-3g',None),('HF_def2SVP','def2-svp',None),('LDA_def2SVP','def2-svp','lda,vwn'),('PBE_def2SVP','def2-svp','pbe'),('B3LYP_def2SVP','def2-svp','b3lyp')]:
    t=time.time()
    mol=gto.M(atom=water,unit='Angstrom',basis=basis,charge=0,spin=0,verbose=0)
    mf=scf.RHF(mol) if xc is None else dft.RKS(mol)
    if xc:
        mf.xc=xc; mf.grids.level=3
    mf.conv_tol=1e-10
    hist=[]
    mf.callback=lambda env: hist.append({'iteration':int(env['cycle'])+1,'energy_hartree':float(env['e_tot'])})
    mf.kernel()
    if not mf.converged: raise RuntimeError(label+' SCF did not converge')
    dm=mf.make_rdm1()
    ao=dft.numint.eval_ao(mol,coords)
    rho=dft.numint.eval_rho(mol,ao,dm).reshape(y.shape)
    arrays[label]=rho
    grids=dft.gen_grid.Grids(mol); grids.level=4; grids.build()
    ne=0.
    for p in range(0,len(grids.coords),20000):
        aoq=dft.numint.eval_ao(mol,grids.coords[p:p+20000])
        ne+=float(np.dot(dft.numint.eval_rho(mol,aoq,dm),grids.weights[p:p+20000]))
    rec=dict(label=label,method='RHF' if xc is None else xc,basis=basis,nao=mol.nao_nr(),electrons=mol.nelectron,energy_hartree=float(mf.e_tot),scf_converged=bool(mf.converged),scf_history=hist,integrated_electrons=ne,seconds=round(time.time()-t,3))
    results.append(rec); print(json.dumps(rec),flush=True)

# Frozen dimer, common basis through ghost atoms, same query coordinates.
# Illustrative geometry; no geometry optimization or claim of equilibrium.
atomsA=[('O',(0.,0.,0.)),('H',(0.,-.757,.587)),('H',(0.,.757,.587))]
atomsB=[('O',(0.,0.,2.9)),('H',(0.,.757,3.487)),('H',(0.,-.757,3.487))]
dy,dz=np.meshgrid(np.linspace(-3,3,141),np.linspace(-2.5,5.5,181),indexing='ij')
dc=np.column_stack([np.zeros(dy.size),dy.ravel(),dz.ravel()])/lib.param.BOHR
arrays['dimer_y_angstrom']=dy[:,0];arrays['dimer_z_angstrom']=dz[0,:]
dimer=[]
for lab,aa in [('AB',atomsA+atomsB),('A_ghostB',atomsA+[('ghost-'+a,p) for a,p in atomsB]),('ghostA_B',[('ghost-'+a,p) for a,p in atomsA]+atomsB)]:
    mol=gto.M(atom=aa,unit='Angstrom',basis='def2-svp',verbose=0)
    mf=dft.RKS(mol);mf.xc='pbe';mf.grids.level=3;mf.conv_tol=1e-10;mf.kernel()
    if not mf.converged: raise RuntimeError(lab+' failed')
    ao=dft.numint.eval_ao(mol,dc)
    arrays[lab]=dft.numint.eval_rho(mol,ao,mf.make_rdm1()).reshape(dy.shape)
    dimer.append(dict(label=lab,energy_hartree=float(mf.e_tot),nao=mol.nao_nr(),electrons=mol.nelectron,converged=bool(mf.converged)))
arrays['delta_rho']=arrays['AB']-arrays['A_ghostB']-arrays['ghostA_B']
np.savez_compressed(OUT/'teaching_density_arrays.npz',**arrays)
meta=dict(purpose='Executed teaching examples; not reproduction of any paper',pyscf=pyscf.__version__,python=platform.python_version(),threads=4,geometry_angstrom=water,plane='x=0, y/z in angstrom; density e/bohr^3',water=results,dimer=dimer,dimer_atoms_A=atomsA,dimer_atoms_B=atomsB,dimer_note='Frozen illustrative geometry, PBE/def2-SVP, common ghost basis; no optimization or binding free energy')
(OUT/'teaching_results.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
print('Finished teaching calculations',flush=True)
