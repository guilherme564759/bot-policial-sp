const Discord = require("discord.js")
const config = require("../../config.json")

module.exports = {
    name: "advertencia", // Coloque o nome do comando
    description: "[👑 Moderação] Painel de comandos do sistema policial.", // Coloque a descrição do comando
    type: Discord.ApplicationCommandType.ChatInput,
    options: [
        {
            name: "usuario",
            description: "Mencione o Oficial Advertido",
            type: Discord.ApplicationCommandOptionType.User,
            required: true
        },
        {
            name: "motivo",
            description: "Escreva o Motivo da Advertencia",
            type: Discord.ApplicationCommandOptionType.String,
            required: true
        },
        {
            name: "provas",
            description: "Forneça uma evidência para o aviso. Você pode enviar essas imagens para um site.",
            type: Discord.ApplicationCommandOptionType.String,
            required: false
        },
    ],
    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.ManageGuild)) {
            interaction.reply({ content: `❌ | Você não possui permissão para utilizar este comando.`, ephemeral: true })
        } else {
            let usuario2 = interaction.options.getUser("usuario");
            let target = interaction.guild.members.cache.get(usuario2.id)
            let reason = interaction.options.getString("motivo")
            let evidence = interaction.options.getString("provas") || "Nenhuma Prova Anexada"


            let embed_principal = new Discord.EmbedBuilder()
                .setColor(config.embedcolor)
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL({ dynmiac: true }) })
                .setDescription(`MTD Policia: Informe qual advertencia o oficial: ${target}, receber.`);

            // mensagem de anuncio da advertencia verba no usuario
            let embed_advv = new Discord.EmbedBuilder()
                .setColor(config.embedcolor)
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL({ dynmiac: true }) })
                .setDescription(`MTD Policia informa o Oficial  ${target}, recebeu uma : **Advertência 1 - LEVE**`)
                .addFields(
                    { name: 'Oficial Advertido:', value: `${target}` },
                    { name: 'Motivo da Advertencia', value: `${reason}` },
                    { name: 'Provas', value: `${evidence}` },
                );
            // mensagem de anuncio da advertencia verba no usuario
            let embed_adv1 = new Discord.EmbedBuilder()
                .setColor(config.embedcolor)
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL({ dynmiac: true }) })
                .setDescription(`MTD Policia informa o Oficial  ${target}, recebeu uma :  **Advertência 2 - Média**`)
                .addFields(
                    { name: 'Oficial Advertido:', value: `${target}` },
                    { name: 'Motivo da Advertencia', value: `${reason}` },
                    { name: 'Provas', value: `${evidence}` },
                );
            // mensagem de anuncio da advertencia verba no usuario
            let embed_adv2 = new Discord.EmbedBuilder()
                .setColor(config.embedcolor)
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL({ dynmiac: true }) })
                .setDescription(`MTD Policia informa o Oficial  ${target}, recebeu uma :  **Advertência 3 - Grave**`)
                .addFields(
                    { name: 'Oficial Advertido:', value: `${target}` },
                    { name: 'Motivo da Advertencia', value: `${reason}` },
                    { name: 'Provas', value: `${evidence}` },
                );

            let painel = new Discord.ActionRowBuilder().addComponents(
                new Discord.StringSelectMenuBuilder()
                    .setCustomId("painelprincipal")
                    .setPlaceholder("Clique aqui!")
                    .addOptions(
                        {
                            label: "Advertência 1 - LEVE",
                            description: "Aplique a Advertência 1 - LEVE ao oficial.",
                            emoji: "🚫",
                            value: "advertenciav"
                        },
                        {
                            label: "Advertência 2 - Média",
                            description: "Aplique a Advertência 2 - Média ao oficial.",
                            emoji: "🚫",
                            value: "advertencia1"
                        },
                        {
                            label: "Advertência 3 - Grave",
                            description: "Aplique a Advertência 3 - Grave ao oficial.",
                            emoji: "🚫",
                            value: "advertencia2"
                        },
                    )
            )

            interaction.reply({ embeds: [embed_principal], components: [painel], ephemeral: true }).then(() => {
                interaction.channel.createMessageComponentCollector().on("collect", (c) => {
                    let valor = c.values[0];
                    let canallogadv = interaction.guild.channels.cache.get(config.ADVERTENCIAS.advertanciacanal);


                    if (valor === "advertenciav") {
                        if (!target.roles.cache.has(config.ADVERTENCIAS.cargoadv_verbal)) {
                            c.deferUpdate()
                            canallogadv.send({ embeds: [embed_advv] })
                            target.roles.add(config.ADVERTENCIAS.cargoadv_verbal);
                        } else {
                            interaction.channel.send({ content: `⚠️ | O Oficial ja possue essa advertencia!.`, ephemeral: true })
                        }
                    } else if (valor === "advertencia1") {
                        if (!target.roles.cache.has(config.ADVERTENCIAS.cargoadv_1)) {
                            c.deferUpdate()
                            canallogadv.send({ embeds: [embed_adv1] })
                            target.roles.add(config.ADVERTENCIAS.cargoadv_1);
                        } else {
                            interaction.channel.send({ content: `⚠️ | O Oficial ja possue essa advertencia!.`, ephemeral: true })
                        }
                    } else if (valor === "advertencia2") {
                        if (!target.roles.cache.has(config.ADVERTENCIAS.cargoadv_2)) {
                            c.deferUpdate()
                            canallogadv.send({ embeds: [embed_adv2] })
                            target.roles.add(config.ADVERTENCIAS.cargoadv_2);
                        } else {
                            interaction.channel.send({ content: `⚠️ | O Oficial ja possue essa advertencia!.`, ephemeral: true })
                        }
                    }
                })
            })



        }
    }
}
