const Discord = require('discord.js');
const sqlite3 = require('sqlite3');
const config = require('../config.json');

const db = new sqlite3.Database('registros.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS registros_pendentes (
    usuario_id TEXT PRIMARY KEY,
    canal_id TEXT,
    mensagem_aprovacao_id TEXT,
    nome TEXT,
    id_jogo TEXT,
    patente TEXT,
    unidade TEXT,
    permissao TEXT,
    status TEXT DEFAULT 'pendente',
    criado_em INTEGER
  )`);
});

const PATENTES = [
  'Soldado 2ª Classe',
  'Soldado 1ª Classe',
  'Cabo',
  '3ª Sargento',
  '2ª Sargento',
  '1ª Sargento',
  'Sub Tenente',
  'Aspirante A Oficial',
  '2º Tenente',
  '1º Tenente',
  'Capitao',
  'Tenente-Coronel',
  'Coronel'
];

const UNIDADES = [
  'Força patrulha',
  'Corregedoria',
  'BAEP',
  'CAEP',
  '1º BPChq ROTA',
  '2º BPChq ANCHIETA',
  '3º BPChq HUMAITA',
  '4º BPChq COE'
];

function sanitizeValue(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function patenteRoleId(patente) {
  return config.REGISTRO?.PATENTES?.[sanitizeValue(patente)] || null;
}

function unidadeRoleId(unidade) {
  return config.REGISTRO?.UNIDADES?.[sanitizeValue(unidade)] || null;
}

function buildResumoEmbed(user, data) {
  return new Discord.EmbedBuilder()
    .setColor(config.embedcolor)
    .setAuthor({ name: `${user.username} | Solicitação de Registro`, iconURL: user.displayAvatarURL({ dynamic: true }) })
    .setDescription('Confira os dados do seu registro antes de enviar para aprovação.')
    .addFields(
      { name: 'Nome', value: data.nome || 'Não informado', inline: true },
      { name: 'ID', value: data.id_jogo || 'Não informado', inline: true },
      { name: 'Patente', value: data.patente || 'Não selecionada', inline: true },
      { name: 'Unidade', value: data.unidade || 'Não selecionada', inline: true },
      { name: 'Permissão', value: data.permissao || 'Não informada', inline: false },
    )
    .setFooter({ text: 'Confirme os dados para finalizar o envio.' });
}

function buildAprovacaoEmbed(solicitante, data) {
  return new Discord.EmbedBuilder()
    .setColor(config.embedcolor)
    .setAuthor({ name: `${solicitante.username} | Registro Pendente`, iconURL: solicitante.displayAvatarURL({ dynamic: true }) })
    .setDescription(`${solicitante}`)
    .addFields(
      { name: 'Nome', value: data.nome || 'Não informado', inline: true },
      { name: 'ID', value: data.id_jogo || 'Não informado', inline: true },
      { name: 'Patente', value: data.patente || 'Não selecionada', inline: true },
      { name: 'Unidade', value: data.unidade || 'Não selecionada', inline: true },
      { name: 'Permissão', value: data.permissao || 'Não informada', inline: false },
    )
    .setFooter({ text: `ID do usuário: ${solicitante.id}` });
}

module.exports = async (client, interaction) => {
  if (interaction.isButton() && interaction.customId === 'registro_abrir') {
    const modal = new Discord.ModalBuilder()
      .setCustomId('registro_modal')
      .setTitle('Registro Policial');

    const nome = new Discord.TextInputBuilder()
      .setCustomId('registro_nome')
      .setLabel('Nome')
      .setStyle(Discord.TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);

    const idJogo = new Discord.TextInputBuilder()
      .setCustomId('registro_id')
      .setLabel('ID')
      .setStyle(Discord.TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(30);

    const permissao = new Discord.TextInputBuilder()
      .setCustomId('registro_permissao')
      .setLabel('Permissão')
      .setStyle(Discord.TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100)
      .setPlaceholder('Ex.: Patrulhamento, Administrativo, Supervisão');

    modal.addComponents(
      new Discord.ActionRowBuilder().addComponents(nome),
      new Discord.ActionRowBuilder().addComponents(idJogo),
      new Discord.ActionRowBuilder().addComponents(permissao),
    );

    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === 'registro_modal') {
    const nome = interaction.fields.getTextInputValue('registro_nome');
    const idJogo = interaction.fields.getTextInputValue('registro_id');
    const permissao = interaction.fields.getTextInputValue('registro_permissao');

    const patenteMenu = new Discord.StringSelectMenuBuilder()
      .setCustomId(`registro_patente:${interaction.user.id}`)
      .setPlaceholder('Selecione a patente')
      .addOptions(PATENTES.map((patente) => ({
        label: patente,
        value: patente,
      })));

    const unidadeMenu = new Discord.StringSelectMenuBuilder()
      .setCustomId(`registro_unidade:${interaction.user.id}`)
      .setPlaceholder('Selecione a unidade')
      .addOptions(UNIDADES.map((unidade) => ({
        label: unidade,
        value: unidade,
      })));

    const row1 = new Discord.ActionRowBuilder().addComponents(patenteMenu);
    const row2 = new Discord.ActionRowBuilder().addComponents(unidadeMenu);
    const row3 = new Discord.ActionRowBuilder().addComponents(
      new Discord.ButtonBuilder()
        .setCustomId(`registro_enviar:${interaction.user.id}:${Buffer.from(JSON.stringify({ nome, id_jogo: idJogo, permissao })).toString('base64url')}`)
        .setLabel('Enviar Registro')
        .setStyle(Discord.ButtonStyle.Success)
        .setEmoji('✅')
    );

    return interaction.reply({
      content: 'Selecione sua patente e sua unidade abaixo para concluir o registro.',
      components: [row1, row2, row3],
      ephemeral: true,
    });
  }

  if (interaction.isStringSelectMenu() && (interaction.customId.startsWith('registro_patente:') || interaction.customId.startsWith('registro_unidade:'))) {
    const [, targetUserId] = interaction.customId.split(':');
    if (interaction.user.id !== targetUserId) {
      return interaction.reply({ content: '❌ | Este painel não pertence a você.', ephemeral: true });
    }

    const message = interaction.message;
    const sendButton = message.components[2]?.components?.[0];
    if (!sendButton) {
      return interaction.reply({ content: '❌ | Não foi possível atualizar o painel.', ephemeral: true });
    }

    const [, , encoded] = sendButton.customId.split(':');
    const stored = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    const currentPatente = interaction.customId.startsWith('registro_patente:') ? interaction.values[0] : message.components[0].components[0].options.find(opt => opt.default)?.value;
    const currentUnidade = interaction.customId.startsWith('registro_unidade:') ? interaction.values[0] : message.components[1].components[0].options.find(opt => opt.default)?.value;

    const patenteMenu = new Discord.StringSelectMenuBuilder()
      .setCustomId(`registro_patente:${interaction.user.id}`)
      .setPlaceholder('Selecione a patente')
      .addOptions(PATENTES.map((patente) => ({
        label: patente,
        value: patente,
        default: patente === currentPatente,
      })));

    const unidadeMenu = new Discord.StringSelectMenuBuilder()
      .setCustomId(`registro_unidade:${interaction.user.id}`)
      .setPlaceholder('Selecione a unidade')
      .addOptions(UNIDADES.map((unidade) => ({
        label: unidade,
        value: unidade,
        default: unidade === currentUnidade,
      })));

    const resumo = buildResumoEmbed(interaction.user, {
      ...stored,
      patente: currentPatente,
      unidade: currentUnidade,
    });

    const row1 = new Discord.ActionRowBuilder().addComponents(patenteMenu);
    const row2 = new Discord.ActionRowBuilder().addComponents(unidadeMenu);
    const row3 = new Discord.ActionRowBuilder().addComponents(
      new Discord.ButtonBuilder()
        .setCustomId(`registro_enviar:${interaction.user.id}:${Buffer.from(JSON.stringify({ ...stored, patente: currentPatente, unidade: currentUnidade })).toString('base64url')}`)
        .setLabel('Enviar Registro')
        .setStyle(Discord.ButtonStyle.Success)
        .setEmoji('✅')
    );

    return interaction.update({
      content: 'Selecione sua patente e sua unidade abaixo para concluir o registro.',
      embeds: [resumo],
      components: [row1, row2, row3],
    });
  }

  if (interaction.isButton() && interaction.customId.startsWith('registro_enviar:')) {
    const [, targetUserId, encoded] = interaction.customId.split(':');
    if (interaction.user.id !== targetUserId) {
      return interaction.reply({ content: '❌ | Este painel não pertence a você.', ephemeral: true });
    }

    const data = JSON.parse(Buffer.from(encoded, 'base64url').toString());

    if (!data.patente || !data.unidade) {
      return interaction.reply({ content: '❌ | Selecione a patente e a unidade antes de enviar.', ephemeral: true });
    }

    const canalAprovacao = interaction.guild.channels.cache.get(config.REGISTRO?.canal_aprovacao);
    if (!canalAprovacao) {
      return interaction.reply({ content: '❌ | O canal de aprovação do registro não foi configurado.', ephemeral: true });
    }

    db.run(
      `INSERT OR REPLACE INTO registros_pendentes (usuario_id, canal_id, nome, id_jogo, patente, unidade, permissao, status, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pendente', ?)`,
      [interaction.user.id, interaction.channel.id, data.nome, data.id_jogo, data.patente, data.unidade, data.permissao, Date.now()],
      async (err) => {
        if (err) {
          console.error(err);
          return interaction.reply({ content: '❌ | Ocorreu um erro ao salvar seu registro.', ephemeral: true });
        }

        const embedAprovacao = buildAprovacaoEmbed(interaction.user, data);
        const row = new Discord.ActionRowBuilder().addComponents(
          new Discord.ButtonBuilder()
            .setCustomId(`registro_aceitar:${interaction.user.id}`)
            .setLabel('ACEITAR')
            .setStyle(Discord.ButtonStyle.Success),
          new Discord.ButtonBuilder()
            .setCustomId(`registro_recusar:${interaction.user.id}`)
            .setLabel('RECUSAR')
            .setStyle(Discord.ButtonStyle.Danger)
        );

        const mensagem = await canalAprovacao.send({
          content: `${interaction.user}`,
          embeds: [embedAprovacao],
          components: [row],
        });

        db.run('UPDATE registros_pendentes SET mensagem_aprovacao_id = ? WHERE usuario_id = ?', [mensagem.id, interaction.user.id]);

        return interaction.update({
          content: '✅ | Seu registro foi enviado para aprovação.',
          embeds: [buildResumoEmbed(interaction.user, data)],
          components: [],
        });
      }
    );
  }

  if (interaction.isButton() && (interaction.customId.startsWith('registro_aceitar:') || interaction.customId.startsWith('registro_recusar:'))) {
    if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({ content: '❌ | Você não possui permissão para gerenciar registros.', ephemeral: true });
    }

    const [action, userId] = interaction.customId.split(':');

    db.get('SELECT * FROM registros_pendentes WHERE usuario_id = ?', [userId], async (err, row) => {
      if (err || !row) {
        if (err) console.error(err);
        return interaction.reply({ content: '❌ | Registro não encontrado ou já processado.', ephemeral: true });
      }

      const membro = await interaction.guild.members.fetch(userId).catch(() => null);
      if (!membro) {
        return interaction.reply({ content: '❌ | Não foi possível localizar o membro no servidor.', ephemeral: true });
      }

      if (action === 'registro_aceitar') {
        const cargosAdicionar = [];

        if (config.REGISTRO?.cargo_fixo) cargosAdicionar.push(config.REGISTRO.cargo_fixo);

        const rolePatente = patenteRoleId(row.patente);
        const roleUnidade = unidadeRoleId(row.unidade);

        if (rolePatente) cargosAdicionar.push(rolePatente);
        if (roleUnidade) cargosAdicionar.push(roleUnidade);

        try {
          if (cargosAdicionar.length > 0) {
            await membro.roles.add(cargosAdicionar);
          }
        } catch (roleError) {
          console.error(roleError);
          return interaction.reply({ content: '❌ | Não foi possível adicionar os cargos. Verifique a hierarquia do bot.', ephemeral: true });
        }

        const aprovado = new Discord.EmbedBuilder()
          .setColor(config.embedcolor)
          .setTitle('Registro Aprovado')
          .setDescription(`${membro} teve o registro aprovado com sucesso.`)
          .addFields(
            { name: 'Nome', value: row.nome, inline: true },
            { name: 'ID', value: row.id_jogo, inline: true },
            { name: 'Patente', value: row.patente, inline: true },
            { name: 'Unidade', value: row.unidade, inline: true },
            { name: 'Permissão', value: row.permissao, inline: false },
            { name: 'Aprovado por', value: `${interaction.user}`, inline: false },
          );

        await interaction.update({ content: `${membro}`, embeds: [aprovado], components: [] });
        await membro.send({ embeds: [aprovado] }).catch(() => null);
        db.run('UPDATE registros_pendentes SET status = ? WHERE usuario_id = ?', ['aprovado', userId]);
      } else {
        const recusado = new Discord.EmbedBuilder()
          .setColor(config.embedcolor)
          .setTitle('Registro Recusado')
          .setDescription(`${membro} teve o registro recusado.`)
          .addFields(
            { name: 'Nome', value: row.nome, inline: true },
            { name: 'ID', value: row.id_jogo, inline: true },
            { name: 'Patente', value: row.patente, inline: true },
            { name: 'Unidade', value: row.unidade, inline: true },
            { name: 'Permissão', value: row.permissao, inline: false },
            { name: 'Recusado por', value: `${interaction.user}`, inline: false },
          );

        await interaction.update({ content: `${membro}`, embeds: [recusado], components: [] });
        await membro.send({ embeds: [recusado] }).catch(() => null);
        db.run('UPDATE registros_pendentes SET status = ? WHERE usuario_id = ?', ['recusado', userId]);
      }
    });
  }
};
