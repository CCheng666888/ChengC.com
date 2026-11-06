#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
TOOLS=/home/doubao/edensity-tools
export MAMBA_ROOT_PREFIX="$TOOLS/mamba"
export OMP_NUM_THREADS=2
export MKL_NUM_THREADS=2
export OPENBLAS_NUM_THREADS=2
export MPLBACKEND=Agg
export OMP_STACKSIZE=256M
ulimit -s unlimited
MM="$TOOLS/bin/micromamba"
QC="$TOOLS/mamba/envs/qc"
action="${1:-check}"
shift || true
OUT="${ED_PRACTICE_OUTPUT_ROOT:-$HERE/运行结果}"
mkdir -p "$OUT"
if [[ "$action" == latest ]]; then
    "$MM" run -p "$QC" python "$HERE/practice.py" latest --out "$OUT"
    exit
fi
RUN="$OUT/${action}_$(date +%Y%m%d_%H%M%S)_$$"
mkdir -p "$RUN"
cd "$RUN"
echo "RUN_FOLDER: $RUN"
case "$action" in
  check|pyscf|compare)
    "$MM" run -p "$QC" python "$HERE/practice.py" "$action" --out "$RUN" "$@" 2>&1 | tee console.log ;;
  xtb)
    cp "$HERE/inputs/water.xyz" input.xyz
    "$MM" run -p "$QC" xtb input.xyz --gfn 2 --chrg 0 --uhf 0 --ohess 2>&1 | tee xtb.out
    test -s xtbopt.xyz
    test -s vibspectrum
    "$MM" run -p "$QC" python "$HERE/practice.py" xtb-summary --out "$RUN" ;;
  *) echo "Use: check | xtb | pyscf | compare | latest"; exit 2 ;;
esac
echo "PASS. Results: $RUN"
