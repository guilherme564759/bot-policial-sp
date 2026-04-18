require('dotenv').config();
const Discord = require("discord.js");
const sqlite3 = require('sqlite3');
const config = require("./config.json");
const fs = require("fs");

const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
client.slashCommands = new Discord.Collection();

client.once("clientReady", () => {
  console.log(`📡 Estou online ${client.user.username}`);
  client.user.setActivity({
    name: 'customstatus',
    type: Discord.ActivityType.Custom,
    state: "🚧 Sendo atualizado a todo instante por @wyllyan.br"
  });
});

const interactionShowModalPrender = require("./Events/interactionShowModalPrender");
const interactionFechatTicket = require("./Events/interactionFechatTicket");
const interactionTicketCreate = require("./Events/interactionTicketCreate");
const interactionPostModalPrender = require("./Events/interactionPostModalPrender");
const interactionBatePonto = require("./Events/interactionBatePonto");
const interactionFormAusenciaModal = require("./Events/interactionFormAusenciaModal");
const interactionRegistro = require("./Events/interactionRegistro");

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const cmd = client.slashCommands.get(interaction.commandName);

      if (!cmd) {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "❌ Comando não encontrado.",
            ephemeral: true
          });
        }
        return;
      }

      if (interaction.guild) {
        interaction.member = interaction.guild.members.cache.get(interaction.user.id) || interaction.member;
      }

      await cmd.run(client, interaction);
      return;
    }

    await interactionTicketCreate(client, interaction);
    if (interaction.replied || interaction.deferred) return;

    await interactionFechatTicket(client, interaction);
    if (interaction.replied || interaction.deferred) return;

    await interactionShowModalPrender(client, interaction);
    if (interaction.replied || interaction.deferred) return;

    await interactionPostModalPrender(client, interaction);
    if (interaction.replied || interaction.deferred) return;

    await interactionBatePonto(client, interaction);
    if (interaction.replied || interaction.deferred) return;

    await interactionFormAusenciaModal(client, interaction);
    if (interaction.replied || interaction.deferred) return;

    await interactionRegistro(client, interaction);
    if (interaction.replied || interaction.deferred) return;

  } catch (error) {
    console.error("🚫 Erro na interação:", error);

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ Ocorreu um erro ao processar esta interação.",
          ephemeral: true
        });
      } else if (interaction.deferred && !interaction.replied) {
        await interaction.editReply({
          content: "❌ Ocorreu um erro ao processar esta interação."
        });
      }
    } catch (err) {
      console.error("🚫 Erro ao responder interação:", err);
    }
  }
});

process.on('uncaughtException', (error) => {
  console.log(`🚫 Erro Detectado:\n\n${error.stack}`);
});

process.on('uncaughtExceptionMonitor', (error) => {
  console.log(`🚫 Erro Detectado:\n\n${error.stack}`);
});

client.login(process.env.TOKEN);
