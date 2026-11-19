/** Only same-site paths, so a "next" link can't send users to another site. */
export const isSafePath = (p: string) => p.startsWith("/") && !p.startsWith("//") && !p.startsWith("/\\");
