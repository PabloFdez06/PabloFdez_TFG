import { Link, usePage } from '@inertiajs/react';
import { BookOpen, Folder, LayoutGrid, Menu, Search } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import AppLogoIcon from '@/components/app-logo-icon';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuList,
    navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { UserMenuContent } from '@/components/user-menu-content';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useInitials } from '@/hooks/use-initials';
import { cn, toUrl } from '@/lib/utils';
import { dashboard } from '@/routes';
import type { BreadcrumbItem, NavItem } from '@/types';

type Props = {
    breadcrumbs?: BreadcrumbItem[];
};

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
];

const rightNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: Folder,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

const activeItemStyles =
    '';

export function AppHeader({ breadcrumbs = [] }: Props) {
    const page = usePage();
    const { auth } = page.props;
    const getInitials = useInitials();
    const { isCurrentUrl, whenCurrentUrl } = useCurrentUrl();

    return (
        <>
            <div className="">
                <div className="">
                    {/* Mobile Menu */}
                    <div className="">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className=""
                                >
                                    <Menu className="" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side="left"
                                className=""
                            >
                                <SheetTitle className="">
                                    Navigation menu
                                </SheetTitle>
                                <SheetHeader className="">
                                    <AppLogoIcon className="" />
                                </SheetHeader>
                                <div className="">
                                    <div className="">
                                        <div className="">
                                            {mainNavItems.map((item) => (
                                                <Link
                                                    key={item.title}
                                                    href={item.href}
                                                    className=""
                                                >
                                                    {item.icon && (
                                                        <item.icon className="" />
                                                    )}
                                                    <span>{item.title}</span>
                                                </Link>
                                            ))}
                                        </div>

                                        <div className="">
                                            {rightNavItems.map((item) => (
                                                <a
                                                    key={item.title}
                                                    href={toUrl(item.href)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className=""
                                                >
                                                    {item.icon && (
                                                        <item.icon className="" />
                                                    )}
                                                    <span>{item.title}</span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    <Link
                        href={dashboard()}
                        prefetch
                        className=""
                    >
                        <AppLogo />
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="">
                        <NavigationMenu className="">
                            <NavigationMenuList className="">
                                {mainNavItems.map((item, index) => (
                                    <NavigationMenuItem
                                        key={index}
                                        className=""
                                    >
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                navigationMenuTriggerStyle(),
                                                whenCurrentUrl(
                                                    item.href,
                                                    activeItemStyles,
                                                ),
                                                '',
                                            )}
                                        >
                                            {item.icon && (
                                                <item.icon className="" />
                                            )}
                                            {item.title}
                                        </Link>
                                        {isCurrentUrl(item.href) && (
                                            <div className=""></div>
                                        )}
                                    </NavigationMenuItem>
                                ))}
                            </NavigationMenuList>
                        </NavigationMenu>
                    </div>

                    <div className="">
                        <div className="">
                            <Button
                                variant="ghost"
                                size="icon"
                                className=""
                            >
                                <Search className="" />
                            </Button>
                            <div className="">
                                {rightNavItems.map((item) => (
                                    <Tooltip key={item.title}>
                                        <TooltipTrigger>
                                            <a
                                                href={toUrl(item.href)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className=""
                                            >
                                                <span className="">
                                                    {item.title}
                                                </span>
                                                {item.icon && (
                                                    <item.icon className="" />
                                                )}
                                            </a>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{item.title}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className=""
                                >
                                    <Avatar className="">
                                        <AvatarImage
                                            src={auth.user.avatar}
                                            alt={auth.user.name}
                                        />
                                        <AvatarFallback className="">
                                            {getInitials(auth.user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="" align="end">
                                <UserMenuContent user={auth.user} />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
            {breadcrumbs.length > 1 && (
                <div className="">
                    <div className="">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>
            )}
        </>
    );
}
