"""用小网络拟合一个数学标量场，练习训练循环；不是量子化学模型。"""
import torch
from torch import nn

torch.manual_seed(42)
X = 2*torch.rand(640, 3)-1
y = torch.exp(-3*(X**2).sum(dim=1, keepdim=True))
Xtr, Xte = X[:512], X[512:]
ytr, yte = y[:512], y[512:]
model = nn.Sequential(nn.Linear(3, 32), nn.Tanh(),
                      nn.Linear(32, 32), nn.Tanh(), nn.Linear(32, 1))
optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
loss_fn = nn.MSELoss()
model.train()
for epoch in range(400):
    optimizer.zero_grad()
    pred = model(Xtr)
    loss = loss_fn(pred, ytr)
    loss.backward()
    optimizer.step()
model.eval()
with torch.no_grad():
    print("held-out MSE:", loss_fn(model(Xte), yte).item())
torch.save(model.state_dict(), "toy_field_weights.pt")
# 普通 MLP 不自动满足旋转等变、密度非负或电子数守恒。
