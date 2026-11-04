"""合成一维数据上的 KRR；调参只用训练集，测试集最后使用一次。"""
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.kernel_ridge import KernelRidge
from sklearn.metrics import mean_absolute_error

rng = np.random.default_rng(42)
X = rng.uniform(-3, 3, (240, 1))
y = np.sin(X[:, 0]) + 0.2*X[:, 0] + rng.normal(0, 0.03, len(X))
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)
pipeline = Pipeline([("scale", StandardScaler()),
                     ("krr", KernelRidge(kernel="rbf"))])
search = GridSearchCV(pipeline,
    {"krr__alpha": [1e-4, 1e-2, 1.0], "krr__gamma": [0.1, 1.0, 10.0]},
    scoring="neg_mean_absolute_error", cv=5)
search.fit(Xtr, ytr)
print("best parameters:", search.best_params_)
print("test MAE:", mean_absolute_error(yte, search.predict(Xte)))
# 分子数据应按分子/体系划分，避免同一分子的网格点同时进入训练和测试。
