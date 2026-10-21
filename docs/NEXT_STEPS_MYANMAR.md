# နောက်တစ်ဆင့် လုပ်ဆောင်ရန်

## 1. Local မှာ run လုပ်ရန်
1. ZIP ကို Extract လုပ်ပါ။
2. Node.js LTS install လုပ်ပါ။
3. Project folder ထဲမှာ Terminal ဖွင့်ပါ။
4. `npm install`
5. `npm --prefix api install`
6. `npm --prefix web install`
7. `api/.env.example` ကို `api/.env` အဖြစ် copy လုပ်ပြီး `JWT_SECRET` ပြောင်းပါ။
8. `npm run dev` လုပ်ပါ။
9. Browser မှာ `http://localhost:5173` ဖွင့်ပါ။

Demo account:
- Email: `demo@invento.local`
- Password: `InventoDemo!2026`

## 2. အရင်ဆုံး စမ်းသပ်ရန်
- Login ဝင်ပါ။
- Inventory မှာ product search လုပ်ပါ။
- Add product နဲ့ product အသစ်ထည့်ပါ။
- Stock In / Stock Out စမ်းပါ။
- ရှိပြီးသား quantity ထက်ပိုထုတ်ကြည့်ပါ။ API က reject လုပ်ရပါမယ်။
- Physical Count မှာ quantity မတူရင် reason မထည့်ဘဲ save မရသင့်ပါ။
- History မှာ before / change / after ကိုစစ်ပါ။

## 3. Production မတင်ခင်
- AI voice အတွက် Burmese/English speech provider ရွေးပြီး API ထဲမှာ ချိတ်ရန်
- Expo mobile app, camera scan, microphone permission တည်ဆောက်ရန်
- Employee invitation/permissions ထည့်ရန်
- Refresh token rotation, rate limits, security headers, validation, tests ထည့်ရန်
- Backup/restore, HTTPS, deployment, monitoring စီစဉ်ရန်
- Myanmar device တွေမှာ font, layout, accessibility စမ်းရန်

ဒီ ZIP က စမ်းသပ်ပြီး ဆက်လက်တည်ဆောက်နိုင်တဲ့ full-stack starter ဖြစ်ပါတယ်။ Production-ready app အဖြစ် မသတ်မှတ်ရသေးပါ။


## Mobile UI integration update (2026-10-20)
- The React app now has a phone-sized layout with a fixed bottom navigation bar: Home, Inventory, Scan, Alerts, History.
- The bottom bar respects the device safe-area and stays visible while the page content scrolls.
- The Scan page currently searches live inventory by barcode, SKU, or product name. Camera scanning and voice-assisted entry still require implementation.
- Desktop navigation remains in the sidebar.
- Recommended Windows runtime: Node.js 22 LTS for compatibility with `better-sqlite3`.
