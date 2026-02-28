import { useAuth } from "../components/AuthProvider";
import { useEffect } from "react";
import { useRouter } from "next/router";

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user]);

  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto mt-20">
      <h1 className="text-2xl font-bold">歡迎回來，{user.name}</h1>
      <p>Email: {user.email}</p>
      <button
        onClick={logout}
        className="mt-4 bg-gray-800 text-white px-4 py-2 rounded"
      >
        登出
      </button>
    </div>
  );
};

export default ProfilePage;
