// Legacy prototype events carry the recipient between separators. Only exact
// recipient events belong in an individual chat; task-level entries stay out.
export function recipientEvents(events: string[], id: number) {
  return events.filter((event) =>
    new RegExp(`^(首轮|跟进|回复) ${id}$`).test(event.split(" · ")[1] || ""),
  );
}
