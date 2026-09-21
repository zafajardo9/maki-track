import { client } from "@maki/libs";

export async function getProjectMembers(id: string) {
  const response = await client.project[":id"].members.$get({ param: { id } });
  if (!response.ok) throw new Error("Unable to load project members");
  return response.json();
}
export async function setProjectMember({
  id,
  userId,
  present,
}: {
  id: string;
  userId: string;
  present: boolean;
}) {
  const endpoint = client.project[":id"].members[":userId"];
  const response = present
    ? await endpoint.$put({ param: { id, userId } })
    : await endpoint.$delete({ param: { id, userId } });
  if (!response.ok) throw new Error("Unable to update project membership");
  return response.json();
}
export async function setProjectAccess({
  id,
  accessMode,
}: {
  id: string;
  accessMode: "workspace" | "restricted";
}) {
  const response = await client.project[":id"].access.$put({
    param: { id },
    json: { accessMode },
  });
  if (!response.ok) throw new Error("Unable to update project access");
  return response.json();
}
