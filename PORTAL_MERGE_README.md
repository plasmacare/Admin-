# Plasma Care — Merged Site (Customer + Staff/Admin + B2B)

Ab ek hi repo/deployment hai. Customer-facing site (Home, booking flow)
bilkul pehle jaisa hai — koi change nahi. Staff/Admin panel aur naya B2B
portal `/portal/*` ke peeche lazy-loaded hain, isliye normal customer ka
bundle bada nahi hua.

## Kya kaha se aaya

| Route | Kya hai |
|---|---|
| `/` | Customer site (unchanged) |
| `/portal/login` | Sabka single login — role se decide hota hai kahan bhejna hai |
| `/portal/request-access` | B2B ke liye public request form |
| `/portal/mfa/enroll`, `/portal/mfa/verify` | Admin ka 2FA (sirf role=admin ko dikhega) |
| `/portal/staff/*` | Staff/Admin panel (purana Admin--main ka poora content yahan move hua) |
| `/portal/b2b/*` | Naya B2B portal — Dashboard, Bulk Add, History |

Home page par top-right mein ek naya **"Portal Login"** dropdown/drawer
hai jisme B2B login, Request Access, aur Staff/Admin login teeno milte
hain.

## Setup — order se karo

1. **SQL** (Supabase SQL editor mein, isi order mein):
   - `supabase/role_based_single_login.sql` (agar pehle se run nahi kiya)
   - `supabase/b2b_and_bulk_requests.sql`
2. **Bootstrap admin**: `role_based_single_login.sql` ke andar comment
   mein di gayi query se apne existing admin ko `role='admin'` set karo
   (agar pehle se nahi kiya).
3. **Edge function deploy** (B2B approve button ke kaam karne ke liye):
   ```
   supabase functions deploy approve-b2b-request
   ```
   Isko koi extra secret nahi chahiye — `SUPABASE_URL` aur
   `SUPABASE_SERVICE_ROLE_KEY` Supabase khud provide karta hai.
4. **2FA confirm karo**: Supabase Dashboard → Authentication → Providers
   → Multi-Factor Authentication → Authenticator App **ON** hona chahiye
   (default mein on hota hai, bas confirm kar lo).
5. `.env` mein wahi `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` daalo
   jo customer site already use kar raha tha (same project).
6. `npm install && npm run build`

## Flow — B2B

1. Koi bhi `/portal/request-access` form bharta hai (login ki zarurat
   nahi) → `b2b_requests` table mein pending row ban jaati hai.
2. Admin panel → **B2B Requests** tab → Approve.
3. Edge function real Supabase Auth login banata hai + unko email se
   invite bhejta hai (password set karne ka link).
4. Wo `/portal/login` se login karke `/portal/b2b` pe land karte hain.
5. **Bulk Add**: package/test select karo, patients ek line mein
   `Name, Age, Gender, Phone` format mein paste karo, submit karo.
   Ye `b2b_bulk_requests` table mein jaata hai — staff ise dekh ke
   real bookings mein convert karte hain (jaan-boojh kar seedha
   `bookings` table mein force nahi kiya, taaki uske existing
   scheduling rules na tootein).

## Flow — Admin 2FA

Pehli baar admin login karega → seedha QR-code enroll screen pe jayega
(Authenticator app se scan karna hoga). Uske baad har login pe 6-digit
code maangega. Staff/B2B roles ke liye 2FA zaroori nahi hai.

## Android build

`viewport-fit=cover` + safe-area CSS (`env(safe-area-inset-*)`) already
lagi hui hai poori site mein — jab Android WebView/TWA mein wrap karoge,
status bar/nav bar content ko crop nahi karega. Desktop pe koi effect
nahi (env values 0 rehte hain).

## Note

Purana `Admin--main` repo ab standalone deploy karne ki zarurat nahi —
sab kuch is ek repo mein aa gaya hai. Purana repo backup ke liye rakh
sakte ho, bas use production mein deploy mat karna (do jagah alag-alag
update hone se confusion hoga).
