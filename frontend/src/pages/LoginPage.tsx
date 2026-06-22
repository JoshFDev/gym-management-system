import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { loginRequest } from "../services/auth.service";

export default function LoginPage() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("joshua@example.com");
    const [password, setPassword] = useState("Password123!");
    const [error, setError] = useState("");

    const handleSubmit = async (
        event: React.FormEvent
    ) => {
        event.preventDefault();

        try {
            const response = await loginRequest({
                email,
                password,
            });

            localStorage.setItem(
                "token",
                response.data.token
            );

            navigate("/dashboard");
        } catch {
            setError("Invalid email or password.");
        }
    };

    return (
        <div>
            <h1>ZenithGym</h1>
            <h2>Login</h2>

            <form onSubmit={handleSubmit}>
                <div>
                    <label>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(event) =>
                            setEmail(event.target.value)
                        }
                    />
                </div>

                <div>
                    <label>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(event) =>
                            setPassword(event.target.value)
                        }
                    />
                </div>

                {error && <p>{error}</p>}

                <button type="submit">
                    Login
                </button>
            </form>
        </div>
    );
}