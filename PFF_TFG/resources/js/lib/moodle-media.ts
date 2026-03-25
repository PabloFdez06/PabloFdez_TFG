const MOODLE_PROTECTED_SEGMENTS = ['/pluginfile.php', '/webservice/pluginfile.php', '/theme/image.php', '/user/pix.php'];

function shouldProxyMoodleResource(rawUrl: string): boolean {
    const normalized = rawUrl.trim().toLowerCase();

    if (normalized === '') {
        return false;
    }

    if (normalized.startsWith('/') || normalized.startsWith('//')) {
        return true;
    }

    return MOODLE_PROTECTED_SEGMENTS.some((segment) => normalized.includes(segment));
}

export function toMoodleMediaUrl(rawUrl: string | null): string | null {
    if (! rawUrl) {
        return null;
    }

    const normalized = rawUrl.trim();

    if (normalized === '' || ! shouldProxyMoodleResource(normalized)) {
        return normalized;
    }

    return `/moodle/media?url=${encodeURIComponent(normalized)}`;
}
