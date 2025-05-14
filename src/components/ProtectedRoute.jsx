import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function ProtectedRoute({ children }) {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
        // check current session on mount
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });
        // subscribe to auth changes (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
            }
        );
        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        // you can return a spinner here
        return null;
    }

    if (!session) {
        // no session → redirect to login, preserve intended path in state
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // user is signed in!
    return children;
}