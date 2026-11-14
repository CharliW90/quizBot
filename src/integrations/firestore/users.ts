import type { firestore } from "firebase-admin";
import { ok, err, type Result } from "../../utils/result.js";

type Firestore = firestore.Firestore;

export interface UserGuildRecord {
  usersTeams: string[];
  server: {
    name: string;
    owner: string;
    initialName: string;
    initialOwner: string;
  };
}

export interface UserRecord {
  currentName: string;
  initialName: string;
  username: string;
}

function userDocPath(userId: string) {
  return `users/${userId}`;
}

function guildDocPath(userId: string, guildId: string) {
  return `users/${userId}/servers/${guildId}`;
}

export async function addTeamMember(
  db: Firestore,
  userId: string,
  username: string,
  displayName: string,
  guildId: string,
  guildName: string,
  guildOwnerId: string,
  teamName: string
): Promise<Result<void>> {
  const userRef = db.doc(userDocPath(userId));
  const userSnapshot = await userRef.get();

  if (!userSnapshot.exists) {
    await userRef.set({
      currentName: displayName,
      initialName: displayName,
      username,
    });
  } else {
    const userData = userSnapshot.data() as UserRecord;
    if (userData.currentName !== displayName) {
      await userRef.update({ currentName: displayName });
    }
  }

  const guildRef = db.doc(guildDocPath(userId, guildId));
  const guildSnapshot = await guildRef.get();

  if (!guildSnapshot.exists) {
    await guildRef.set({
      usersTeams: [teamName],
      server: {
        name: guildName,
        owner: guildOwnerId,
        initialName: guildName,
        initialOwner: guildOwnerId,
      },
    });
  } else {
    const guildData = guildSnapshot.data() as UserGuildRecord;
    if (!guildData.usersTeams.includes(teamName)) {
      guildData.usersTeams.unshift(teamName);
      await guildRef.update({ usersTeams: guildData.usersTeams });
    }
    if (guildData.server.name !== guildName || guildData.server.owner !== guildOwnerId) {
      await guildRef.update({
        "server.name": guildName,
        "server.owner": guildOwnerId,
      });
    }
  }

  return ok(undefined);
}

export async function getUserTeamNames(
  db: Firestore,
  userId: string,
  guildId: string
): Promise<Result<string[]>> {
  const userRef = db.doc(userDocPath(userId));
  const userSnapshot = await userRef.get();

  if (!userSnapshot.exists) {
    return ok([]);
  }

  const guildRef = db.doc(guildDocPath(userId, guildId));
  const guildSnapshot = await guildRef.get();

  if (!guildSnapshot.exists) {
    return ok([]);
  }

  const data = guildSnapshot.data() as UserGuildRecord;
  return ok(data.usersTeams);
}
