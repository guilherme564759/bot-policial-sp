const Discord = require('discord.js');
const config = require('../../config.json');

module.exports = {
  name: 'criarregistro',
  description: '[👮 Registro] Cria o painel de registro policial.',
  type: Discord.ApplicationCommandType.ChatInput,
  run: async (client, interaction) => {
    if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '❌ | Você não possui permissão para utilizar este comando.', ephemeral: true });
    }

    const embed = new Discord.EmbedBuilder()
      .setColor(config.embedcolor)
      .setAuthor({ name: `${interaction.guild.name} | Registro Policial`, iconURL: interaction.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL() })
      .setTitle('Central de Registro Policial')
      .setDescription(
        [
          'Prezados policiais, este painel foi criado para formalizar o ingresso e a identificação funcional de cada integrante da corporação.',
          '',
          'Por meio do botão abaixo, você deverá preencher corretamente seus dados de registro para análise do setor responsável. Informe seus dados com atenção, utilizando o nome correto, ID funcional, patente pretendida, unidade e nível de permissão.',
          '',
          'Após o envio, sua solicitação será encaminhada para autorização. Quando aprovada, você receberá o cargo fixo da corporação, o cargo correspondente à patente escolhida e também o cargo da unidade selecionada.',
          '',
          '**Atenção:** informações incorretas, divergentes ou enviadas de má-fé poderão resultar na recusa imediata do seu registro.'
        ].join('\n')
      )
      .setFooter({ text: 'Secretaria da Segurança Pública - Polícia Militar' });

    const row = new Discord.ActionRowBuilder().addComponents(
      new Discord.ButtonBuilder()
        .setCustomId('registro_abrir')
        .setLabel('Realizar Registro')
        .setEmoji('📝')
        .setStyle(Discord.ButtonStyle.Primary)
    );

    await interaction.reply({ content: '✅ | Painel de registro enviado.', ephemeral: true });
    await interaction.channel.send({ embeds: [embed], components: [row] });
  }
};
