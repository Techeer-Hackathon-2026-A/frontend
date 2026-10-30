import "server-only";
import { sealData, unsealData } from "iron-session";
import { cookies } from "next/headers";

// GitHub 토큰은 암호화한 httpOnly 쿠키에만 둔다. 브라우저 코드로는 절대 넘기지 않는다.

export const SESSION_COOKIE = "patchi_session";
const TTL = 60 * 60 * 24 * 7;

export interface User {
  login: string;
  name: string;
  avatarUrl: string;
}

interface Session {
  token: string;
  user: User;
  /** 백엔드 project_id → owner/name. 백엔드 스캔 응답에 레포 이름이 없어서 스캔을 시작할 때 기억해 둔다 */
  projects?: Record<string, string>;
}

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET 은 32자 이상이어야 해요");
  return s;
}

export async function sealSession(session: Session) {
  return sealData(session, { password: secret(), ttl: TTL });
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: TTL,
};

async function readSession(): Promise<Session | undefined> {
  const sealed = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sealed) return undefined;
  const data = await unsealData<Partial<Session>>(sealed, { password: secret(), ttl: TTL });
  return data.token && data.user ? (data as Session) : undefined;
}

/** 로그인한 사용자. 없거나 만료됐으면 undefined */
export async function getUser(): Promise<User | undefined> {
  return (await readSession())?.user;
}

/** 서버에서 GitHub·백엔드를 부를 때만 쓴다 */
export async function getToken(): Promise<string | undefined> {
  return (await readSession())?.token;
}

/** 이 사용자가 스캔한 레포 (백엔드 project_id → owner/name) */
export async function getProjects(): Promise<Record<string, string>> {
  return (await readSession())?.projects ?? {};
}

/** 서버 액션에서만 부를 수 있다 (쿠키를 다시 쓴다) */
export async function rememberProject(projectId: number, repo: string) {
  const session = await readSession();
  if (!session) return;
  const projects = { ...session.projects, [projectId]: repo };
  (await cookies()).set(SESSION_COOKIE, await sealSession({ ...session, projects }), sessionCookieOptions);
}
