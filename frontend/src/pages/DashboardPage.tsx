import { useEffect, useState } from "react";

import { getDashboardStats } from "../services/dashboard.service";

interface DashboardStats {
    totalMembers: number;
    activeSubscriptions: number;
    todayAttendances: number;
    totalRevenue: number;
}

export default function DashboardPage() {
    const [stats, setStats] =
        useState<DashboardStats | null>(null);

    useEffect(() => {
        const loadStats = async () => {
            const response =
                await getDashboardStats();

            setStats(response.data);
        };

        loadStats();
    }, []);

    if (!stats) {
        return <p>Loading...</p>;
    }

    const logout = () => {
        localStorage.removeItem("token");
        window.location.href = "/login";
    };
return (
    <div>

        <button onClick={logout}>
            Logout
        </button>

        <h1>Dashboard</h1>

        <div>
            <p>Total members: {stats.totalMembers}</p>
            <p>
                Active subscriptions:{" "}
                {stats.activeSubscriptions}
            </p>
            <p>
                Today attendances:{" "}
                {stats.todayAttendances}
            </p>
            <p>
                Total revenue: ${stats.totalRevenue}
            </p>
        </div>

    </div>
);
}