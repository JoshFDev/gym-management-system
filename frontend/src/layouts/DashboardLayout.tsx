import { Link, Outlet } from "react-router-dom";

export default function DashboardLayout() {

    const logout = () => {
        localStorage.removeItem("token");
        window.location.href = "/login";
    };

    return (
        <div
            style={{
                display: "flex",
                minHeight: "100vh",
            }}
        >
            <aside
                style={{
                    width: "250px",
                    padding: "20px",
                    borderRight: "1px solid #ddd",
                }}
            >
                <h2>ZenithGym</h2>

                <nav
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                    }}
                >
                    <Link to="/dashboard">
                        Dashboard
                    </Link>

                    <Link to="/members">
                        Members
                    </Link>

                    <Link to="/plans">
                        Plans
                    </Link>

                    <Link to="/subscriptions">
                        Subscriptions
                    </Link>

                    <Link to="/attendance">
                        Attendance
                    </Link>

                    <Link to="/payments">
                        Payments
                    </Link>

                    <button
                        onClick={logout}
                    >
                        Logout
                    </button>
                </nav>
            </aside>

            <main
                style={{
                    flex: 1,
                    padding: "20px",
                }}
            >
                <Outlet />
            </main>
        </div>
    );
}