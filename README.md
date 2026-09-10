# 📚 O'quv markazi — Boshqaruv tizimi

1-4 sinf o'quvchilari uchun statistika kuzatuv tizimi. Uch qismdan iborat:

1. **Admin panel** (veb-sayt) — siz uchun: o'qituvchi, guruh, o'quvchi, ota-ona boshqaruvi va statistika
2. **O'qituvchi paneli** — o'qituvchi darsni "yopadi": davomat + baho + izoh kiritadi
3. **Telegram bot** — ota-onalar farzandi statistikasini o'zi so'raganda ko'radi

---

## 1-QADAM: Kompyuterga kerakli dasturni o'rnatish

Agar hali o'rnatilmagan bo'lsa, **Node.js** dasturini yuklab oling:
👉 https://nodejs.org (LTS versiyani tanlang)

O'rnatilganini tekshirish uchun terminalda:
```
node -v
```

## 2-QADAM: Loyihani tayyorlash

Ushbu papkani (edu-tizim) kompyuteringizga yoki serveringizga ko'chiring, so'ng terminalda shu papka ichida:

```bash
npm install
```

Bu barcha kerakli kutubxonalarni yuklab oladi (bir marta bajariladi).

## 3-QADAM: Sozlamalarni kiritish (.env fayl)

`.env.example` faylidan nusxa oling va nomini `.env` deb o'zgartiring:

```bash
cp .env.example .env
```

So'ng `.env` faylini oching va quyidagilarni to'ldiring:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=o'zingiz xohlagan kuchli parol
BOT_TOKEN=BotFather'dan olingan token
PORT=3000
```

### Telegram bot tokenini qanday olish kerak?

1. Telegramda **@BotFather** ni toping va `/start` bosing
2. `/newbot` buyrug'ini yuboring
3. Botga nom bering (masalan: "Ravnaq Oquv Markazi")
4. Botga username bering — u albatta `bot` bilan tugashi kerak (masalan: `ravnaq_markaz_bot`)
5. BotFather sizga uzun bir token beradi (masalan: `123456789:ABCdefGhIJKlmNoPQRstuVwxYZ`) — shu tokenni `.env` fayliga `BOT_TOKEN=` qatoriga qo'ying

## 4-QADAM: Tizimni ishga tushirish

```bash
npm start
```

Agar hammasi to'g'ri bo'lsa, terminalda quyidagilarni ko'rasiz:
```
✅ Server ishga tushdi: http://localhost:3000
✅ Telegram bot ishga tushdi
```

Endi brauzeringizda **http://localhost:3000** manzilini oching — bu sizning admin panelingiz.

> ⚠️ Doimiy ishlashi uchun (kompyuterni o'chirganda ham to'xtamasligi uchun) buni albatta bitta serverga (VPS) joylashtirish kerak. Buning uchun oxiridagi "Doimiy ishga tushirish" bo'limiga qarang.

---

## Tizim qanday ishlaydi

### Siz (Admin) sifatida:
1. Admin panelga kiring (`.env` dagi login/parol bilan)
2. **"O'qituvchilar"** bo'limida o'qituvchilarni qo'shing — har biriga login va parol bering, shularni o'qituvchilarga bering
3. **"Guruhlar"** bo'limida guruh yarating va o'qituvchi biriktiring
4. **"O'quvchilar"** bo'limida o'quvchilarni qo'shib, guruh va ota-onaga bog'lang
5. **"Ota-onalar"** bo'limida ota-onani qo'shing — tizim avtomatik **6 xonali kod** yaratadi
6. Shu 6 xonali kodni ota-onaga bering (SMS, qog'ozda, og'zaki — qanday qulay bo'lsa)
7. **"Statistika"** bo'limida barcha o'qituvchilarning faolligini (kim baholayapti, kim kechikayapti) kuzatib turing

### O'qituvchi sifatida:
1. Siz bergan login/parol bilan kiradi
2. **"Darslar"** bo'limida "Yangi dars ochish" tugmasini bosadi — guruh, sana, mavzuni kiritadi
3. Dars tugagach, "Baholash" tugmasini bosadi — har bir o'quvchi uchun davomat, baho va izoh kiritadi
4. "Saqlash" bosgach, bu ma'lumot avtomatik ravishda sizga (admin panelga) va ota-onaga (Telegram orqali) ko'rinadigan bo'ladi

### Ota-ona sifatida:
1. Telegramda sizning botingizni topadi, `/start` bosadi
2. Siz bergan 6 xonali kodni yuboradi
3. Shundan keyin istalgan vaqtda quyidagi tugmalar orqali farzandi haqida ma'lumot oladi:
   - **📅 Bugungi dars**
   - **📊 Bu hafta**
   - **📈 Bu oy**
   - **ℹ️ Farzandim haqida** (umumiy o'rtacha baho, davomat foizi)

---

## Doimiy ishga tushirish (production, VPS serverda)

Kompyuteringizni o'chirganda ham tizim ishlashda davom etishi uchun, buni albatta biror server (VPS)ga joylashtirish va **pm2** kabi vosita bilan ishga tushirish tavsiya etiladi:

```bash
npm install -g pm2
pm2 start index.js --name edu-tizim
pm2 save
pm2 startup
```

Bu buyruqlar tizimni orqa fonda doimiy ishlaydigan qilib qo'yadi, hatto server qayta yuklansa ham avtomatik ishga tushadi.

Veb-saytga tashqi domendan kirish uchun (masalan `panel.sizningsayt.uz`), serveringizga **nginx** o'rnatib, 3000-portni shu domenga yo'naltirishingiz kerak bo'ladi — bu bosqichda xohlasangiz, buni ham qadamlab tushuntirib beraman.

---

## Ma'lumotlar qayerda saqlanadi?

Barcha ma'lumotlar loyiha papkasidagi **`data.json`** faylida saqlanadi. Bu faylni muntazam zaxira (backup) qilib turishni tavsiya qilamiz — masalan, kuniga bir marta boshqa joyga nusxalab qo'yish orqali.

## Fayllar tuzilishi

```
edu-tizim/
├── index.js        → Tizimni ishga tushiruvchi asosiy fayl
├── server.js        → Admin panel va API (backend)
├── bot.js            → Telegram bot logikasi
├── db.js             → Ma'lumotlar bazasi bilan ishlash
├── utils.js          → Yordamchi funksiyalar
├── data.json         → Barcha ma'lumotlar shu yerda saqlanadi (avtomatik yaratiladi)
├── .env               → Maxfiy sozlamalar (login, parol, bot token)
├── public/            → Admin panelning veb-interfeysi
│   ├── index.html
│   ├── style.css
│   └── app.js
└── package.json
```

## Keyingi bosqichlar uchun g'oyalar (kengaytirish)

- Har bir baho qo'yilganda ota-onaga **avtomatik** xabar yuborish (hozir "so'ralganda" ishlaydi)
- SMS orqali ham xabar yuborish (Telegram ishlatmagan ota-onalar uchun)
- Haftalik/oylik PDF hisobot generatsiyasi
- O'qituvchi uchun mobil-qulay interfeys

Agar shulardan birortasini qo'shishni xohlasangiz — ayting, qo'shib beraman.
