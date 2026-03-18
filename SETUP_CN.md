# 📖 保姆级使用教程 — 智能晚点名系统

> 本文档面向零基础用户，从"代码在哪里"到"系统跑起来"，手把手带你完成每一步。

---

## 目录

1. [代码在哪里？如何下载](#1-代码在哪里如何下载)
2. [项目结构说明](#2-项目结构说明代码都在哪个文件)
3. [准备工作：安装必备软件](#3-准备工作安装必备软件)
4. [第一步：配置后端](#4-第一步配置后端)
5. [第二步：配置前端](#5-第二步配置前端)
6. [第三步：启动系统](#6-第三步启动系统)
7. [教师角色使用教程](#7-教师角色使用教程)
8. [学生角色使用教程](#8-学生角色使用教程)
9. [常见问题 FAQ](#9-常见问题-faq)

---

## 1. 代码在哪里？如何下载

### 方式一：从 GitHub 下载（推荐）

代码保存在 GitHub 仓库中，地址是：

```
https://github.com/985211-max/987
```

**第一步：打开网页**

1. 用浏览器打开上面的地址
2. 点击页面右上角绿色的 **`<> Code`** 按钮
3. 点击 **`Download ZIP`**
4. 解压到你想放代码的位置，比如 `D:\attendance-system\`

**或者用 Git 命令克隆（推荐，方便以后更新）：**

```bash
# 在你想放代码的目录下，打开命令行窗口，运行：
git clone https://github.com/985211-max/987.git
cd 987
```

### 方式二：直接查看已有的本地代码

如果你已经下载过代码，项目文件夹内容如下：

```
987/                  ← 项目根目录（你下载/克隆的文件夹）
├── backend/          ← 后端代码（服务器、数据库）
├── frontend/         ← 前端代码（网页界面）
├── docs/             ← 文档、PPT
├── README.md         ← 项目英文说明
├── SETUP_CN.md       ← 本教程（你正在看的这个文件）
└── shiyah.docx       ← 设计文档
```

---

## 2. 项目结构说明（代码都在哪个文件）

```
backend/
├── server.js                  ← 后端入口，启动服务器
├── .env.example               ← 配置模板（需要复制为 .env）
├── package.json               ← 后端依赖列表
├── models/
│   ├── User.js                ← 用户数据结构（学生/教师）
│   ├── Class.js               ← 课程数据结构
│   ├── Attendance.js          ← 考勤记录
│   └── Notification.js        ← 通知消息
├── routes/
│   ├── auth.js                ← 登录/注册 接口
│   ├── attendance.js          ← 签到、课程、统计 接口
│   └── notifications.js       ← 通知 接口
├── middleware/
│   └── auth.js                ← 登录验证中间件
└── utils/
    ├── mailer.js              ← 发邮件功能
    └── scheduler.js           ← 定时任务（每天7点提醒、每小时异常检测）

frontend/
├── package.json               ← 前端依赖列表
├── public/
│   └── index.html             ← 网页 HTML 模板
└── src/
    ├── index.js               ← 前端入口
    ├── App.js                 ← 路由配置
    ├── index.css              ← 全局样式
    ├── context/
    │   └── AuthContext.js     ← 登录状态管理
    └── components/
        ├── Login.js           ← 登录页面
        ├── Register.js        ← 注册页面
        ├── Navbar.js          ← 顶部导航栏（含通知铃铛）
        ├── StudentDashboard.js ← 学生仪表盘
        └── TeacherDashboard.js ← 教师仪表盘
```

---

## 3. 准备工作：安装必备软件

在启动项目之前，需要先在电脑上安装以下软件。**每个软件只需要安装一次。**

### 3.1 安装 Node.js（必须）

Node.js 是运行后端代码的引擎，也用来安装依赖包。

1. 打开 [https://nodejs.org](https://nodejs.org)
2. 下载 **LTS 版本**（左边那个，稳定版）
3. 双击安装包，一路点"下一步"即可
4. 安装完成后，打开命令行（Windows：`Win + R` → 输入 `cmd`），验证：

```bash
node -v     # 应该显示类似 v20.x.x
npm -v      # 应该显示类似 10.x.x
```

> ✅ 如果两个命令都有版本号输出，说明 Node.js 安装成功。

### 3.2 安装 MongoDB（必须）

MongoDB 是项目使用的数据库，用来存储用户、课程、考勤数据。

**方式一：本地安装（适合开发）**

1. 打开 [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. 选择 **Windows / macOS**，版本选 **7.x**，点 Download
3. 安装时勾选"Install MongoDB as a Service"（作为系统服务自动运行）
4. 安装完成后，MongoDB 会在后台自动运行

验证 MongoDB 是否运行：

```bash
# Windows（在命令行中）:
mongo --version        # 或
mongosh --version

# macOS:
mongosh --version
```

**方式二：使用 MongoDB Atlas 云数据库（适合不想本地安装的用户）**

1. 打开 [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)，注册免费账号
2. 创建免费集群（Free Tier / M0）
3. 创建数据库用户（记住用户名和密码）
4. 点"Connect" → "Connect your application" → 复制连接字符串，格式如下：
   ```
   mongodb+srv://用户名:密码@cluster0.xxxxx.mongodb.net/attendance_system
   ```
5. 后面配置 `.env` 时用这个字符串替换 `MONGODB_URI`

### 3.3 安装 Git（可选，用于克隆代码）

1. 打开 [https://git-scm.com](https://git-scm.com) 下载安装
2. 安装后验证：`git --version`

---

## 4. 第一步：配置后端

### 4.1 打开后端文件夹

用命令行进入后端目录：

```bash
# 假设你的代码放在 D:\attendance-system\987\
cd D:\attendance-system\987\backend

# macOS / Linux:
cd ~/attendance-system/987/backend
```

> 💡 **Windows 小技巧**：在 Windows 文件管理器中，进入 `backend` 文件夹，在地址栏输入 `cmd` 然后回车，就能直接在当前目录打开命令行。

### 4.2 安装后端依赖包

```bash
npm install
```

这会自动下载所有需要的库（存放在 `backend/node_modules/` 文件夹，体积较大，正常现象）。

安装完成后，命令行会显示类似：
```
added 120 packages in 15s
found 0 vulnerabilities
```

### 4.3 创建配置文件 `.env`

后端需要一个 `.env` 文件来存放数据库地址、密钥等配置信息。

**第一步：复制模板文件**

```bash
# Windows:
copy .env.example .env

# macOS / Linux:
cp .env.example .env
```

**第二步：编辑 `.env` 文件**

用记事本或者任意文本编辑器（推荐 VS Code）打开 `backend/.env`，内容如下，按注释修改：

```ini
# 后端服务端口号（不用改，保持 5000）
PORT=5000

# MongoDB 数据库连接地址
# 如果是本地 MongoDB：
MONGODB_URI=mongodb://localhost:27017/attendance_system
# 如果是 MongoDB Atlas 云数据库，替换为你的连接字符串：
# MONGODB_URI=mongodb+srv://用户名:密码@cluster0.xxxxx.mongodb.net/attendance_system

# JWT 签名密钥（随意填写一段复杂字符串，越长越安全，不要泄露给别人）
JWT_SECRET=MySecretKey_ChangeThis_To_Something_Long_And_Random_2024

# 发送通知邮件的 Gmail 账号（不需要邮件功能可以留空）
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=Smart Attendance <your_email@gmail.com>

# 前端地址（开发时不用改）
CLIENT_URL=http://localhost:3000
```

> ⚠️ **关于 Gmail 邮件功能（可选）：**
>
> 1. 登录 Gmail → 账号设置 → 安全性 → 开启「两步验证」
> 2. 再进入安全性 → 「应用专用密码」→ 选择"其他"，生成 16 位密码
> 3. 把这个 16 位密码填入 `EMAIL_PASS`
>
> 如果暂时不需要邮件功能，直接**留空**即可，系统其他功能不受影响。

---

## 5. 第二步：配置前端

**打开新的命令行窗口**，进入前端目录：

```bash
cd D:\attendance-system\987\frontend    # Windows
# 或
cd ~/attendance-system/987/frontend     # macOS/Linux
```

安装前端依赖包：

```bash
npm install
```

安装完成后，命令行会显示类似：
```
added 1400 packages in 60s
```

> ⏳ 前端依赖包较多，第一次安装可能需要 1~3 分钟，请耐心等待。

---

## 6. 第三步：启动系统

**需要同时运行两个命令行窗口，一个跑后端，一个跑前端。**

### 6.1 启动后端（窗口 1）

```bash
cd D:\attendance-system\987\backend
npm start
```

成功启动后，你会看到：
```
MongoDB connected
Server running on port 5000
```

> ✅ 这说明后端已经在 `http://localhost:5000` 正常运行了。

### 6.2 启动前端（窗口 2）

```bash
cd D:\attendance-system\987\frontend
npm start
```

成功启动后，浏览器会**自动打开** `http://localhost:3000`，显示登录页面。

> ✅ 如果浏览器没有自动打开，手动访问 `http://localhost:3000` 即可。

### 6.3 系统端口说明

| 地址 | 作用 |
|------|------|
| `http://localhost:3000` | 前端网页（你平时打开这个） |
| `http://localhost:5000` | 后端 API（前端自动调用，不用手动打开）|
| `http://localhost:5000/api/health` | 检查后端是否正常运行 |

---

## 7. 教师角色使用教程

### 7.1 注册教师账号

1. 打开 `http://localhost:3000`，点击 **Register here（注册）**
2. 填写：
   - Full Name（姓名）：你的名字
   - Email Address（邮箱）：你的邮箱
   - Password（密码）：至少 6 位
3. 在角色选择中，点击 **Teacher（教师）**（右边那个）
4. 点击 **Create Account**

注册成功后，系统自动跳转到**教师仪表盘**。

### 7.2 创建课程

1. 在教师仪表盘，点击右上角或侧边的 **"+ Create Class"（创建课程）** 按钮
2. 填写课程信息：
   - **Class Name（课程名称）**：如"高等数学A"
   - **Class Code（课程代码）**：如"MATH101"（学生用这个代码加入你的课）
   - **Schedule（上课时间）**：
     - 选择星期几（如 Monday / Tuesday）
     - 设置上课时间（如 09:00）和下课时间（如 10:30）
     - 点击"Add Slot"可以添加多个上课时段
3. 点击 **Create** 完成创建

> 💡 **课程代码**很重要！学生通过输入这个代码来加入你的课程，请把它分享给学生。

### 7.3 生成二维码（学生扫码签到）

1. 在左侧选择一个课程
2. 点击课程旁边的 **QR Code** 按钮
3. 屏幕上会出现一个二维码，有效期 **2 小时**
4. 让学生用手机扫描这个二维码完成签到
5. 关闭弹窗，点击 **Refresh** 或重新进入记录页面查看签到情况

### 7.4 查看出勤记录

1. 在左侧导航点击 **Records（记录）**
2. 选择要查看的课程
3. 可以看到每次上课的学生出勤情况：
   - 🟢 **Present（到场）**：正常签到
   - 🟡 **Late（迟到）**：超过上课时间 10 分钟后签到
   - 🔴 **Absent（缺勤）**：未签到
   - ⚪ **Excused（请假）**：已批准的请假

### 7.5 手动标记出勤

如果某个学生没有自己签到，教师可以手动标记：

1. 进入 **Records** 页面，找到该学生该日期的记录
2. 点击操作列的 **Edit（编辑）** 按钮
3. 修改出勤状态（到场/迟到/缺勤/请假）
4. 点击 **Save** 保存

或者在 **Mark Attendance（手动标记）** 表单中：
- 输入学生 ID
- 选择课程、日期、状态
- 点击 Submit

### 7.6 查看统计报表

1. 点击 **Reports（报表）**
2. 可以看到：
   - **柱状图**：每天的出勤人数趋势
   - **进度条**：每位学生的出勤率（低于 70% 显示红色警告）

---

## 8. 学生角色使用教程

### 8.1 注册学生账号

1. 打开 `http://localhost:3000`，点击 **Register here（注册）**
2. 填写姓名、邮箱、密码
3. 在角色选择中，点击 **Student（学生）**（左边那个）
4. 可以填写 **Student ID（学号）**（选填，如"STU2024001"）
5. 点击 **Create Account**

注册成功后，系统自动跳转到**学生仪表盘**。

### 8.2 加入课程

1. 在学生仪表盘找到 **Join Class（加入课程）** 输入框
2. 输入教师分享给你的**课程代码**（如"MATH101"）
3. 点击 **Join** 按钮
4. 成功后，课程会出现在你的课程列表中

### 8.3 签到

**方式一：在仪表盘点击签到按钮**

1. 在仪表盘找到你要签到的课程
2. 点击该课程的 **Check In（签到）** 按钮
3. 系统会根据当前时间判断你是"准时"还是"迟到"：
   - **上课时间前 → 上课时间 + 10 分钟内**：算作 ✅ **准时（Present）**
   - **超过 10 分钟**：算作 ⚠️ **迟到（Late）**，会通知教师

> 💡 注意：签到按钮只在**该课程上课时间段**期间可以点击。

**方式二：扫描教师的二维码**

1. 教师展示二维码后，用手机扫描
2. 系统自动完成签到，无需其他操作

### 8.4 查看出勤记录

1. 点击左侧导航的 **History（历史记录）**
2. 选择要查看的课程
3. 可以看到每次上课的签到状态和时间

### 8.5 查看出勤统计

1. 点击 **Dashboard（仪表盘）**
2. 中间的**甜甜圈图**显示你的整体出勤率：
   - 绿色 = 到场次数
   - 黄色 = 迟到次数
   - 红色 = 缺勤次数

### 8.6 通知

1. 顶部导航栏右边有个**铃铛图标 🔔**
2. 有新通知时会显示红色数字
3. 点击铃铛查看：
   - 迟到通知
   - 缺勤警告（缺勤率超过 30% 时触发）
   - 每天 7 点发送的上课提醒

---

## 9. 常见问题 FAQ

### ❓ Q1：启动后端报错"MongoDB connection error"

**原因**：MongoDB 没有运行。

**解决方法**：
- **Windows**：打开"服务"（Win+R 输入 `services.msc`），找到 `MongoDB`，右键"启动"
- **macOS**：运行 `brew services start mongodb-community`
- 或使用 MongoDB Atlas 云数据库（见第 3.2 节）

---

### ❓ Q2：启动后端报错"Error: Cannot find module 'express'"

**原因**：没有安装依赖包。

**解决方法**：
```bash
cd backend
npm install
```

---

### ❓ Q3：前端启动后浏览器打开，但提示"无法连接到服务器"或接口报错

**原因**：后端没有启动，或后端端口不是 5000。

**解决方法**：
1. 确认后端命令行窗口显示 `Server running on port 5000`
2. 访问 `http://localhost:5000/api/health`，如果返回 `{"status":"ok",...}` 说明后端正常

---

### ❓ Q4：忘记.env 在哪里，怎么重新配置？

配置文件在 `backend/.env`。如果没有这个文件：
```bash
cd backend
copy .env.example .env    # Windows
cp .env.example .env      # macOS/Linux
```

然后用记事本打开 `backend/.env` 进行编辑。

---

### ❓ Q5：npm install 速度很慢怎么办？

切换为国内镜像源（淘宝）：

```bash
npm config set registry https://registry.npmmirror.com
```

设置后重新运行 `npm install`。

---

### ❓ Q6：关闭命令行后，下次如何重新启动？

每次重新使用系统，都需要重新启动后端和前端：

```bash
# 窗口 1（后端）:
cd 你的代码路径/backend
npm start

# 窗口 2（前端）:
cd 你的代码路径/frontend
npm start
```

---

### ❓ Q7：如何停止系统？

在对应的命令行窗口按 **`Ctrl + C`**，然后输入 `Y` 确认即可。

---

### ❓ Q8：端口被占用，启动报错"EADDRINUSE: address already in use :::5000"

**原因**：5000 端口被其他程序占用。

**解决方法**：
```bash
# Windows（找到占用 5000 端口的进程 ID）：
netstat -ano | findstr :5000
# 然后：
taskkill /PID <进程ID> /F

# macOS/Linux：
lsof -i :5000
kill -9 <进程ID>
```

或者修改 `backend/.env` 中的 `PORT=5001`，同时修改 `frontend/package.json` 中的 `"proxy": "http://localhost:5001"`。

---

## 📁 快速启动总结（每次使用前执行）

```bash
# =========== 后端（命令行窗口 1） ===========
cd [你的代码路径]/backend
npm start
# 看到 "MongoDB connected" + "Server running on port 5000" 即成功

# =========== 前端（命令行窗口 2） ===========
cd [你的代码路径]/frontend
npm start
# 浏览器自动打开 http://localhost:3000
```

---

*如有问题，请查看本文档第 9 节「常见问题 FAQ」，或在 GitHub Issues 中提问。*
