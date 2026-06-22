import { useEffect, useState } from "react";

import { getAttendances } from "../services/attendance.service";

interface Attendance {
    id: string;

    member: {
        fullName: string;
        email?: string;
        phone?: string;
    };

    checkInAt: string;
    status: string;
}

export default function AttendancePage() {
    const [attendances, setAttendances] =
        useState<Attendance[]>([]);

    useEffect(() => {
        const loadAttendances = async () => {
            const response = await getAttendances();

            setAttendances(response.data);
        };

        loadAttendances();
    }, []);

    return (
        <div>
            <h1>Attendance</h1>

            <table border={1} cellPadding={8}>
                <thead>
                    <tr>
                        <th>Member</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Check-in</th>
                        <th>Status</th>
                    </tr>
                </thead>

                <tbody>
                    {attendances.map((attendance) => (
                        <tr key={attendance.id}>
                            <td>{attendance.member.fullName}</td>
                            <td>{attendance.member.email}</td>
                            <td>{attendance.member.phone}</td>
                            <td>
                                {new Date(
                                    attendance.checkInAt
                                ).toLocaleString()}
                            </td>
                            <td>{attendance.status}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}