export interface MemberUser {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    membershipStatus: string;
}

const MEMBER_TOKEN_KEY = "member_token";
const MEMBER_USER_KEY = "member_user";

export const getStoredMemberToken = (): string | null =>
    localStorage.getItem(MEMBER_TOKEN_KEY);

export const getStoredMember = (): MemberUser | null => {
    try {
        const raw = localStorage.getItem(MEMBER_USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
};

export const setMemberAuth = (token: string, member: MemberUser) => {
    localStorage.setItem(MEMBER_TOKEN_KEY, token);
    localStorage.setItem(MEMBER_USER_KEY, JSON.stringify(member));
};

export const clearMemberAuth = () => {
    localStorage.removeItem(MEMBER_TOKEN_KEY);
    localStorage.removeItem(MEMBER_USER_KEY);
};

export const logoutMember = () => {
    clearMemberAuth();
    window.location.href = "/miembro/login";
};

export const isMemberLoggedIn = (): boolean => {
    return !!getStoredMemberToken();
};

export const useMemberAuth = () => {
    const member = getStoredMember();
    const token = getStoredMemberToken();
    return { member, token, isLoggedIn: !!token };
};
