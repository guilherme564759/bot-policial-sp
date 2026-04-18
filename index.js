require('dotenv').config();
const Discord = require("discord.js");
const sqlite3 = require('sqlite3');
const config = require("./config.json");
const fs = require("fs");

const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds
  ]
});


client.on("ready", () => {
  console.log(`📡 Estou online ${client.user.username}`)
  client.user.setActivity({
    name: 'customstatus',
    type: Discord.ActivityType.Custom,
    state: "🚧 Sendo atualizado a todo instante por @wyllyan.br"
})

});

client.login(process.env.TOKEN)

client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();

// Handlers _______________________________________


client.on('interactionCreate', (interaction) => {

  if (interaction.type === Discord.InteractionType.ApplicationCommand) {

    const cmd = client.slashCommands.get(interaction.commandName);

    if (!cmd) return interaction.reply(`Error`);

    interaction["member"] = interaction.guild.members.cache.get(interaction.user.id);

    cmd.run(client, interaction)

  }
})

client.slashCommands = new Discord.Collection()

require('./handler')(client)

const interactionShowModalPrender = require("./Events/interactionShowModalPrender");
const interactionFechatTicket = require("./Events/interactionFechatTicket");
const interactionTicketCreate = require("./Events/interactionTicketCreate");
const interactionPostModalPrender = require("./Events/interactionPostModalPrender");
const interactionBatePonto = require("./Events/interactionBatePonto");
const interactionFormAusenciaModal = require("./Events/interactionFormAusenciaModal");
const interactionRegistro = require("./Events/interactionRegistro");


client.on("interactionCreate", async (interaction) => {
    await interactionTicketCreate(client, interaction) ;
  }
)
client.on("interactionCreate", async (interaction) => {
  await interactionFechatTicket(client, interaction);
});

client.on("interactionCreate", async (interaction) => {
  await interactionShowModalPrender(client, interaction);
});

client.on('interactionCreate', async (interaction) => {
 await interactionPostModalPrender(client, interaction);
})

client.on('interactionCreate', async interaction => {
  await interactionBatePonto(client, interaction)
});

client.on('interactionCreate', async interaction => {
  await interactionFormAusenciaModal(client, interaction)
});

client.on('interactionCreate', async interaction => {
  await interactionRegistro(client, interaction)
});

process.on('uncaughtException', (error, origin) => {
  console.log(`🚫 Erro Detectado:]\n\n${error.stack}`);
});

process.on('uncaughtExceptionMonitor', (error, origin) => {
  console.log(`🚫 Erro Detectado:\n\n${error.stack}`);
});
