# 📋 智能晚点名系统

一款面向学院的轻量级 **智能晚点名 Web 应用**，支持教师发起签到、学生在线打卡、异常预警和出勤统计可视化。

---

## ✨ 功能特性

| 功能 | 描述 |
|------|------|
| 🔐 身份验证 | 教师 / 学生双角色登录，JWT 令牌鉴权 |
| 📍 智能签到 | 实时倒计时，截止前签到记"出勤"，截止后记"迟到" |
| 📊 统计可视化 | 出勤趋势柱状图、当日签到分布饼图、学生汇总表 |
| ⚠️ 异常提醒 | 自动生成缺勤/迟到提醒，教师一键标记已读 |
| 👩‍🏫 教师管理 | 发起/关闭签到会话，手动修正学生出勤状态 |
| 📱 响应式设计 | 支持 PC 与手机浏览器访问 |

---

## 🚀 快速部署（本地运行）

### 1. 环境要求
- **Node.js** ≥ 18（已在 v18、v20、v22、v24 上验证通过）
- npm（随 Node.js 一起安装）

### 2. 安装依赖

```bash
cd attendance-system/backend
npm install
```

### 3. 启动服务器

```bash
npm start
```

服务器启动后控制台会输出：

```
🎓 智能晚点名系统已启动
📡 访问地址: http://localhost:3000
```

### 4. 打开浏览器

访问 **http://localhost:3000**

---

## 👤 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 教师 | `teacher01` | `teacher123` |
| 学生 | `stu001` ~ `stu005` | `student123` |

> 学生也可在登录页点击"注册"自行注册新账号

---

## 📂 项目结构

```
attendance-system/
├── backend/
│   ├── server.js          # Express 主入口
│   ├── db.js              # SQLite 数据库初始化 + 种子数据
│   ├── package.json
│   └── routes/
│       ├── auth.js        # 登录 / 注册接口
│       ├── attendance.js  # 签到会话 / 签到 / 记录接口
│       └── stats.js       # 统计接口
└── frontend/
    ├── index.html         # 登录页
    ├── student.html       # 学生签到页
    ├── teacher.html       # 教师管理页
    ├── css/
    │   └── style.css
    └── js/
        ├── api.js         # 公共请求工具
        ├── login.js
        ├── student.js
        └── teacher.js
```

---

## 🔧 环境变量（可选）

在 `backend/` 目录下创建 `.env` 文件：

```env
PORT=3000
JWT_SECRET=your_custom_secret_here
```

---

## 📡 API 文档概览

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录，返回 JWT |
| POST | `/api/auth/register` | 学生自注册 |
| POST | `/api/attendance/sessions` | 教师创建签到会话 |
| GET  | `/api/attendance/sessions/today` | 获取今日开放会话（学生） |
| POST | `/api/attendance/checkin` | 学生签到 |
| GET  | `/api/attendance/sessions/:id/records` | 获取会话记录（教师） |
| PATCH| `/api/attendance/sessions/:id/close` | 关闭会话（教师） |
| POST | `/api/attendance/sessions/:id/generate-alerts` | 生成缺勤提醒 |
| GET  | `/api/attendance/alerts` | 获取异常提醒列表 |
| GET  | `/api/stats/overview` | 教师概览数据 |
| GET  | `/api/stats/class` | 班级签到历史统计 |
| GET  | `/api/stats/student` | 学生出勤汇总 |

---

## 🌐 云端部署建议

### 方案一：Render（免费）
1. 将此仓库 push 到 GitHub
2. 登录 [render.com](https://render.com) → New Web Service
3. 选择仓库，设置：
   - **Root directory**: `attendance-system/backend`
   - **Build command**: `npm install`
   - **Start command**: `npm start`
4. 部署完成后获得公网域名

### 方案二：本地局域网部署
```bash
# 绑定到局域网地址，让同一网络的设备访问
PORT=3000 node server.js
# 其他设备通过 http://<本机IP>:3000 访问
```

---

## 📞 操作流程

### 教师操作
1. 使用教师账号登录
2. 在"发起晚点名"填写班级、日期、截止时间 → 点击"发起签到"
3. 实时查看签到进度，可手动修正状态
4. 签到结束后点击"关闭签到"，再点"生成缺勤提醒"
5. 在"异常提醒"区域查看未签到学生

### 学生操作
1. 使用学生账号登录（或注册新账号）
2. 首页展示今日签到状态和倒计时
3. 在截止时间前点击"立即签到"
4. 查看"我的签到记录"了解历史出勤情况
