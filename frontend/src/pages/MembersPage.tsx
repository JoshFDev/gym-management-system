import { useEffect, useState } from "react";

import { getMembers } from "../services/member.service";

interface Member {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    membershipStatus: string;
}

export default function MembersPage() {
    const [members, setMembers] = useState<Member[]>([]);

    useEffect(() => {
        const loadMembers = async () => {
            const response = await getMembers();

            setMembers(response.data);
        };

        loadMembers();
    }, []);

    return (
        <div>
            <h1>Members</h1>

            <table border={1} cellPadding={8}>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Status</th>
                    </tr>
                </thead>

                <tbody>
                    {members.map((member) => (
                        <tr key={member.id}>
                            <td>
                                {member.firstName} {member.lastName}
                            </td>
                            <td>{member.email}</td>
                            <td>{member.phone}</td>
                            <td>{member.membershipStatus}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}