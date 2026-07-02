// import { useEffect, useState } from "react";
// import type { User } from "@/types/user";
// import { getItem, saveItem } from "@/lib/storage";
// import { fetchMe } from "@/actions/authActions";

// export function useAuth() {
//   const [user, setUser] = useState<User | null>(() => getItem("user"));
//   const [loading, setLoading] = useState<boolean>(!user);

//   useEffect(() => {
//     if (!user) {
//       fetchMe().then((u) => { setUser(u); saveItem("user", u); }).catch(() => setUser(null)).finally(() => setLoading(false));
//     }
//   }, [user]);

//   return { user, setUser, loading };
// }
