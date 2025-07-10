import React, { useState, useEffect } from "react";
import Homepage from "./pages/homepage";
import AuthPage from "./components/AuthPage";

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is already logged in
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/me', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = (userData) => {
        setUser(userData);
    };

    const handleSignup = (userData) => {
        setUser(userData);
    };

    const handleLogout = async () => {
        try {
            await fetch('http://localhost:5000/api/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div>   
            {user ? (
                <Homepage user={user} onLogout={handleLogout} />
            ) : (
                <AuthPage onLogin={handleLogin} onSignup={handleSignup} />
            )}
        </div>
    );
}

export default App;