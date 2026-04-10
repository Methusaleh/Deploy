import React, { useState } from "react";
import styles from "./Auth.module.css";
import { useBoards } from "../context/BoardContext";

const Auth = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
  });
  const [error, setError] = useState("");
  const { dispatch } = useBoards();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (isLogin) {
        const params = new URLSearchParams();
        params.append("username", formData.email);
        params.append("password", formData.password);

        const response = await fetch(`${import.meta.env.VITE_API_URL}/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params,
        });

        if (!response.ok) throw new Error("Invalid email or password");

        const data = await response.json();
        const token = data.access_token;
        localStorage.setItem("token", token);

        const userResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/users/me`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!userResponse.ok) throw new Error("Failed to fetch user profile");

        const userData = await userResponse.json();

        dispatch({ type: "login", payload: userData });
        onLoginSuccess();
      } else {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/register`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          },
        );

        if (!response.ok) throw new Error("Registration failed");
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <h2 className={styles.title}>
          {isLogin ? "Welcome Back" : "Join Deploy"}
        </h2>
        {error && <p style={{ color: "#ff4d4d" }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <input
                className={styles.inputField}
                type="text"
                placeholder="First Name"
                required
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
              />
              <input
                className={styles.inputField}
                type="text"
                placeholder="Last Name"
                required
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
              />
            </>
          )}
          <input
            className={styles.inputField}
            type="email"
            placeholder="Email"
            required
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />
          <input
            className={styles.inputField}
            type="password"
            placeholder="Password"
            required
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
          />
          <button className={styles.submitBtn} type="submit">
            {isLogin ? "Login" : "Create Account"}
          </button>
        </form>

        <p onClick={() => setIsLogin(!isLogin)} className={styles.toggleText}>
          {isLogin
            ? "Don't have an account? Register"
            : "Already have an account? Login"}
        </p>
      </div>
    </div>
  );
};

export default Auth;
