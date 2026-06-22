import { useEffect, useState } from "react";

import {
    createMember,
    getMembers,
} from "../services/member.service";

interface Member {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    gender?: string;
    membershipStatus: string;
}

export default function MembersPage() {
    const [members, setMembers] = useState<Member[]>([]);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [gender, setGender] = useState("");

const loadMembers = async () => {
    const response = await getMembers();

    setMembers(response.data);
};

useEffect(() => {
    const fetchMembers = async () => {
        const response = await getMembers();

        setMembers(response.data);
    };

    fetchMembers();
}, []);

    const handleCreateMember = async (
        event: React.FormEvent
    ) => {
        event.preventDefault();

        await createMember({
            firstName,
            lastName,
            email,
            phone,
            gender,
        });

        setFirstName("");
        setLastName("");
        setEmail("");
        setPhone("");
        setGender("");

        loadMembers();
    };

    return (
        <div>
            <h1>Members</h1>

            <form onSubmit={handleCreateMember}>
                <h2>Create Member</h2>

                <input
                    placeholder="First name"
                    value={firstName}
                    onChange={(event) =>
                        setFirstName(event.target.value)
                    }
                />

                <input
                    placeholder="Last name"
                    value={lastName}
                    onChange={(event) =>
                        setLastName(event.target.value)
                    }
                />

                <input
                    placeholder="Email"
                    value={email}
                    onChange={(event) =>
                        setEmail(event.target.value)
                    }
                />

                <input
                    placeholder="Phone"
                    value={phone}
                    onChange={(event) =>
                        setPhone(event.target.value)
                    }
                />

                <input
                    placeholder="Gender"
                    value={gender}
                    onChange={(event) =>
                        setGender(event.target.value)
                    }
                />

                <button type="submit">
                    Create
                </button>
            </form>

            <br />

            <table border={1} cellPadding={8}>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Gender</th>
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
                            <td>{member.gender}</td>
                            <td>{member.membershipStatus}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}