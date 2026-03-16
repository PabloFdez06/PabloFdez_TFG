import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import type { User } from '@/types';

export function UserInfo({
    user,
    showEmail = false,
}: {
    user: User;
    showEmail?: boolean;
}) {
    const getInitials = useInitials();

    return (
        <>
            <Avatar className="">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="">
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar>
            <div className="">
                <span className="">{user.name}</span>
                {showEmail && (
                    <span className="">
                        {user.email}
                    </span>
                )}
            </div>
        </>
    );
}
