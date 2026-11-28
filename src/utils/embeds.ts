import { EmbedBuilder } from "discord.js";

export const EMBED_AUTHOR = {
  name: "Virtual Quizzes",
  iconURL: "https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png",
  url: "https://www.virtual-quiz.co.uk/",
} as const;

export const EMBED_IMAGES = {
  banner: "https://cdn.discordapp.com/attachments/633012685902053397/1239615993156862016/virtualQuizzes.png",
  sent: "https://cdn.discordapp.com/attachments/633012685902053397/1250728073293201420/sent.png",
  medalTop: "https://cdn.discordapp.com/attachments/633012685902053397/1258126047296094319/top.png",
  medalFirst: "https://cdn.discordapp.com/attachments/633012685902053397/1258126224698642542/first.png",
  medalSecond: "https://cdn.discordapp.com/attachments/633012685902053397/1258126320089436303/second.png",
  medalThird: "https://cdn.discordapp.com/attachments/633012685902053397/1258126424628269067/third.png",
  medalPoop: "https://cdn.discordapp.com/attachments/633012685902053397/1258126602600972333/poop.png",
  adminLeave: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZG1rdDBkcnVhMzQ2NHJhYTR1NjR1cW1jNnlzemFvN25tZGxwM3dhMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l2JJKs3I69qfaQleE/giphy.gif",
} as const;

export function getMedalUrl(correctCount: number, totalQuestions: number): string {
  if (totalQuestions === 0) return EMBED_IMAGES.medalPoop;
  const percent = correctCount / totalQuestions;
  if (percent >= 1) return EMBED_IMAGES.medalTop;
  if (percent >= 0.75) return EMBED_IMAGES.medalFirst;
  if (percent >= 0.5) return EMBED_IMAGES.medalSecond;
  if (percent >= 0.25) return EMBED_IMAGES.medalThird;
  return EMBED_IMAGES.medalPoop;
}

export function successEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder().setAuthor(EMBED_AUTHOR).setTitle(title).setDescription(description).setColor(0x2ecc71);
}

export function errorEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder().setAuthor(EMBED_AUTHOR).setTitle(title).setDescription(description).setColor(0xe74c3c);
}

export function confirmEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder().setAuthor(EMBED_AUTHOR).setTitle(title).setDescription(description).setColor(0xf39c12);
}
