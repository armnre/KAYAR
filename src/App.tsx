import { useEffect, useState } from "react";
import { useRevealOnScroll } from "./components/ui";
import Home from "./pages/Home";
import Coaches from "./pages/Coaches";
import CoachProfile from "./pages/CoachProfile";
import BodyYar from "./pages/BodyYar";
import Admin from "./pages/Admin";
import Manage from "./pages/Manage";
import Screens from "./pages/Screens";
import AppHome from "./pages/AppHome";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import Morshed from "./pages/Morshed";
import Campaigns from "./pages/Campaigns";
import { AuthScreen } from "./modules/auth/AuthScreen";
import { useKayar } from "./app/store";

/** KAYAR application composition root — hash routes only; no server capability is simulated. */
function useHashRoute() {
  const read = () => {
    const raw = window.location.hash.replace(/^#/, "");
    return raw.startsWith("/") ? raw : "/";
  };
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onHash = () => setRoute(read());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

export default function App() {
  const route = useHashRoute();
  useRevealOnScroll(route);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [route]);

  if (route.startsWith("/coach/")) return <CoachProfile />;

  switch (route) {
    case "/":
      return <Home />;
    case "/app":
      return <AppHome />;
    case "/onboarding":
      return <Onboarding />;
    case "/coaches":
      return <Coaches />;
    case "/bodyyar":
      return <BodyYar />;
    case "/morshed":
      return <Morshed />;
    case "/campaigns":
      return <Campaigns />;
    case "/profile":
      return <Profile />;
    case "/admin":
      return <Admin />;
    case "/manage":
      return <Manage />;
    case "/screens":
      return <Screens />;
    case "/login":
      return <Login />;
    default:
      return <Home />;
  }
}

function Login() {
  const k = useKayar();
  return (
    <AuthScreen
      gateway={k.gateway}
      deliveredCode={k.inbox?.code ?? null}
      onAuthenticated={() => {
        window.location.hash = "#/app";
      }}
    />
  );
}
