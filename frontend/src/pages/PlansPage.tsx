import { useEffect, useState } from "react";

import {
    createPlan,
    getPlans,
} from "../services/plan.service";

interface Plan {
    id: string;
    name: string;
    description?: string;
    price: number;
    durationDays: number;
    status: string;
}

export default function PlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [durationDays, setDurationDays] = useState("");

    const loadPlans = async () => {
        const response = await getPlans();
        setPlans(response.data);
    };

    useEffect(() => {
        const fetchPlans = async () => {
            const response = await getPlans();
            setPlans(response.data);
        };

        fetchPlans();
    }, []);

    const handleCreatePlan = async (
        event: React.FormEvent
    ) => {
        event.preventDefault();

        await createPlan({
            name,
            description,
            price: Number(price),
            durationDays: Number(durationDays),
        });

        setName("");
        setDescription("");
        setPrice("");
        setDurationDays("");

        loadPlans();
    };

    return (
        <div>
            <h1>Plans</h1>

            <form onSubmit={handleCreatePlan}>
                <h2>Create Plan</h2>

                <input
                    placeholder="Name"
                    value={name}
                    onChange={(event) =>
                        setName(event.target.value)
                    }
                />

                <input
                    placeholder="Description"
                    value={description}
                    onChange={(event) =>
                        setDescription(event.target.value)
                    }
                />

                <input
                    placeholder="Price"
                    type="number"
                    value={price}
                    onChange={(event) =>
                        setPrice(event.target.value)
                    }
                />

                <input
                    placeholder="Duration days"
                    type="number"
                    value={durationDays}
                    onChange={(event) =>
                        setDurationDays(event.target.value)
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
                        <th>Description</th>
                        <th>Price</th>
                        <th>Duration</th>
                        <th>Status</th>
                    </tr>
                </thead>

                <tbody>
                    {plans.map((plan) => (
                        <tr key={plan.id}>
                            <td>{plan.name}</td>
                            <td>{plan.description}</td>
                            <td>${plan.price}</td>
                            <td>{plan.durationDays} days</td>
                            <td>{plan.status}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}