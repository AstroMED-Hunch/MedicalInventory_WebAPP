# 📋 PRESENTATION CHEAT SHEET
## Print this or keep on your phone!

---

## 🎯 **30-Second Pitch**
*"I built a web dashboard for a Visual Inventory Tracking System. The Jetson Nano camera detects when medical supplies are removed, and my web UI displays inventory, usage logs, and AI predictions for astronauts on the ISS."*

---

## 🔑 **Key Numbers**
- **Password:** `67`
- **Port:** `8000` (if using server)
- **Files:** HTML, CSS, JS + 2 JSON files
- **Total Code:** ~1,200 lines

---

## 🎤 **Demo Order (2 minutes)**
1. **Login** → Password: `67`
2. **Dashboard** → Show video placeholder + inventory table
3. **Inventory Log** → Click tab, show usage history
4. **AI Predictions** → Click tab, show color-coded cards
5. **Smart Scanner** → Click tab, paste text, show extraction

---

## ❓ **Quick Q&A Answers**

**"What's your role?"**
→ *"I built the web user interface - the dashboard astronauts use to view inventory data."*

**"How does it connect to Jetson Nano?"**
→ *"Jetson Nano writes logs.json to SD card. Web UI reads it to display usage history."*

**"What technologies?"**
→ *"Vanilla JavaScript, HTML, CSS - no frameworks. Simple and explainable."*

**"How does AI work?"**
→ *"Currently simulated. In full version, ML model on Jetson analyzes usage patterns."*

**"Biggest challenge?"**
→ *"Creating medical-grade UI - high contrast, clear fonts, intuitive navigation."*

---

## 🚨 **If Something Breaks**
- **Login fails?** → Password is `67`, check console (F12)
- **JSON won't load?** → Must use server: `npx http-server -p 8000`
- **Looks broken?** → Hard refresh: Ctrl+Shift+R

---

## 📝 **Key Points to Emphasize**
✅ Beginner-friendly code (no frameworks)  
✅ Functional security (login system)  
✅ Offline capable (works without internet)  
✅ Medical-grade UI (high contrast, clear)  
✅ Production-ready structure  

---

**YOU'VE GOT THIS! 🚀**

