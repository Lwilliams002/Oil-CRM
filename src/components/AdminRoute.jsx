import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AdminRoute({ children }) {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingRole, setLoadingRole] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
      // if we have a logged-in user, mark role as loading so AdminRoute waits
      if (session?.user?.id) {
        setLoadingRole(true);
      } else {
        setIsAdmin(false);
        setLoadingRole(false);
      }
    });

    // subscribe to auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user?.id) {
          // user just logged in or changed: reload role
          setLoadingRole(true);
        } else {
          // user logged out
          setIsAdmin(false);
          setLoadingRole(false);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const loadRole = async () => {
      if (!session?.user?.id) {
        setIsAdmin(false);
        setLoadingRole(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error) {
          // Log unexpected errors only
          console.error("[AdminRoute] error loading role:", error);
          setIsAdmin(false);
        } else {
          if (!data) {
            // No profile row yet: fall back to a root admin check by user_id
            setIsAdmin(session.user.id === "b806b0ed-92e5-4884-9a50-126b5734a8e9");
          } else {
            setIsAdmin(data.role === "admin");
          }
        }
      } catch (err) {
        console.error("[AdminRoute] exception loading role:", err);
        setIsAdmin(false);
      } finally {
        setLoadingRole(false);
      }
    };

    loadRole();
  }, [session]);

  // still loading session or role → show nothing or a spinner
  if (loadingSession || loadingRole) {
    return null; // or a spinner component
  }

  // no session → redirect to login
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // not admin → redirect to login (or a 403 page)
  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  // admin is signed in!
  return children;
}