export function generateMeetingCode() {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const randomPart = () =>
    Array.from(
      { length: 3 },
      () => letters[Math.floor(Math.random() * letters.length)]
    ).join("");
  return `${randomPart()}-${randomPart()}-${randomPart()}`;
}
