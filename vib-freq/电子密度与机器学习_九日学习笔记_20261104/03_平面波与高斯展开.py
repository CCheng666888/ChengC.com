"""同一个一维函数、相同基函数数量，比较两种最小二乘表示。"""
import numpy as np
import matplotlib.pyplot as plt

x = np.linspace(-np.pi, np.pi, 600, endpoint=False)
y = np.exp(-5 * x**2)
# 15 个实平面波基函数：1 + 7 组 cos / sin。
plane = [np.ones_like(x)]
for k in range(1, 8):
    plane.extend([np.cos(k*x), np.sin(k*x)])
A = np.column_stack(plane)
# 15 个局域高斯。中心和宽度是本练习设定，不代表量化化学基组。
centers = np.linspace(-np.pi, np.pi, 15)
B = np.exp(-((x[:, None]-centers[None, :])/0.45)**2)
ca = np.linalg.lstsq(A, y, rcond=None)[0]
cb = np.linalg.lstsq(B, y, rcond=None)[0]
for name, pred in [("plane waves", A@ca), ("Gaussians", B@cb)]:
    print(name, "RMSE", np.sqrt(np.mean((pred-y)**2)))
    plt.plot(x, pred, label=name)
plt.plot(x, y, "k--", label="target exp(-5x^2)")
plt.xlabel("x (dimensionless)")
plt.ylabel("f(x)")
plt.legend()
plt.tight_layout()
plt.savefig("basis_comparison.png", dpi=160)
# 这是固定采样点上的拟合演示；不用于判断真实分子哪种基组更准确。
