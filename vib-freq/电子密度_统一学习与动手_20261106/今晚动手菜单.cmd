@echo off
setlocal
chcp 65001 >nul
if not "%~1"=="" goto run
:menu
cls
echo ==============================================
echo   今晚动手：水分子与电子密度
echo ==============================================
echo   1  核心环境自检与氢分子基准
echo   2  xTB 水分子优化与振动
echo   3  PySCF 水分子 PBE 密度
echo   4  RHF 两种基组比较（选做）
echo   5  打开今晚的运行结果
echo   6  打开已配置的量化终端
echo   7  打开 JupyterLab（选做）
echo   8  打开 Avogadro 图解与示例文件夹
echo   0  退出
choice /c 123456780 /n /m "请选择："
set "_ED_CHOICE=%errorlevel%"
if "%_ED_CHOICE%"=="1" start "" "%ComSpec%" /c call "%~f0" check
if "%_ED_CHOICE%"=="2" start "" "%ComSpec%" /c call "%~f0" xtb
if "%_ED_CHOICE%"=="3" start "" "%ComSpec%" /c call "%~f0" pyscf
if "%_ED_CHOICE%"=="4" start "" "%ComSpec%" /c call "%~f0" compare
if "%_ED_CHOICE%"=="5" start "" explorer.exe "%~dp0实践\运行结果"
if "%_ED_CHOICE%"=="6" start "" "%~dp0..\..\08_计算环境与启动\02_打开量化计算终端.cmd"
if "%_ED_CHOICE%"=="7" start "" "%~dp0..\..\08_计算环境与启动\03_打开JupyterLab_浏览器学习.cmd"
if "%_ED_CHOICE%"=="8" start "" explorer.exe "%~dp0..\..\08_分子可视化入门"
if "%_ED_CHOICE%"=="9" exit /b 0
goto menu
:run
wsl.exe -d Ubuntu --cd "%~dp0实践" --exec bash ./run_tonight.sh %*
set "_ED_RESULT=%errorlevel%"
echo.
echo 返回码：%_ED_RESULT% （0 表示正常完成）
if "%EDENSITY_NO_PAUSE%"=="1" exit /b %_ED_RESULT%
pause
exit /b %_ED_RESULT%
