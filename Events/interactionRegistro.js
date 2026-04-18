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
  return String(value || '')
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

function patenteSimbolo(patente) {
  const mapa = {
    'Soldado 2ª Classe': '[ ]',
    'Soldado 1ª Classe': '[❯]',
    'Cabo': '[❯❯]',
    '3ª Sargento': '[❯❯❯]',
    '2ª Sargento': '[❮ ❯❯❯]',
    '1ª Sargento': '[❮❮ ❯❯❯]',
    'Sub Tenente': '[△]',
    'Aspirante A Oficial': '[✯]',
    '2º Tenente': '[✧]',
    '1º Tenente': '[✧✧]',
    'Capitao': '[✦]',
    'Tenente-Coronel': '[✦✦]',
    'Coronel': '[✦✦✦]'
  };

  return mapa[patente] || '[❯]';
}

function safeName(text, max = 32) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function buildNick(patente, nome, idJogo) {
  const simbolo = patenteSimbolo(patente);
  const nomeLimpo = safeName(nome, 18);
  const idLimpo = safeName(idJogo, 8);
  return `${simbolo} ${nomeLimpo} | ${idLimpo}`.slice(0, 32);
}

function buildResumoEmbed(user, data) {
  return new Discord.EmbedBuilder()
    .setColor(config.embedcolor || 0x2b2d31)
    .setAuthor({
      name: `${user.username} | Solicitação de Registro`,
      iconURL: user.displayAvatarURL({ dynamic: true })
    })
    .setDescription('Confira os dados do seu registro antes de enviar para aprovação.')
    .addFields(
      { name: 'Nome', value: data.nome || 'Não informado', inline: true },
      { name: 'ID', value: data.id_jogo || 'Não informado', inline: true },
      { name: 'Patente', value: data.patente || 'Não selecionada', inline: true },
      { name: 'Unidade', value: data.unidade || 'Não selecionada', inline: true },
      { name: 'Permissão', value: data.permissao || 'Não informada', inline: false }
    )
    .setFooter({ text: 'Confirme os dados para finalizar o envio.' });
}

function buildAprovacaoEmbed(solicitante, data) {
  return new Discord.EmbedBuilder()
    .setColor(config.embedcolor || 0x2b2d31)
    .setAuthor({
      name: `${solicitante.username} | Registro Pendente`,
      iconURL: solicitante.displayAvatarURL({ dynamic: true })
    })
    .setDescription(`${solicitante}`)
    .addFields(
      { name: 'Nome', value: data.nome || 'Não informado', inline: true },
      { name: 'ID', value: data.id_jogo || 'Não informado', inline: true },
      { name: 'Patente', value: data.patente || 'Não selecionada', inline: true },
      { name: 'Unidade', value: data.unidade || 'Não selecionada', inline: true },
      { name: 'Permissão', value: data.permissao || 'Não informada', inline: false }
    )
    .setFooter({ text: `ID do usuário: ${solicitante.id}` });
}

function getRegistro(usuarioId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM registros_pendentes WHERE usuario_id = ?',
      [usuarioId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function buildPainelSelecao(userId, patenteSelecionada = null, unidadeSelecionada = null) {
  const patenteMenu = new Discord.StringSelectMenuBuilder()
    .setCustomId(`registro_patente:${userId}`)
    .setPlaceholder('Selecione a patente')
    .addOptions(
      PATENTES.map((patente) => ({
        label: patente,
        value: patente,
        default: patente === patenteSelecionada
      }))
    );

  const unidadeMenu = new Discord.StringSelectMenuBuilder()
    .setCustomId(`registro_unidade:${userId}`)
    .setPlaceholder('Selecione a unidade')
    .addOptions(
      UNIDADES.map((unidade) => ({
        label: unidade,
        value: unidade,
        default: unidade === unidadeSelecionada
      }))
    );

  const enviarButton = new Discord.ButtonBuilder()
    .setCustomId(`registro_enviar:${userId}`)
    .setLabel('Enviar Registro')
    .setStyle(Discord.ButtonStyle.Success)
    .setEmoji('✅');

  return [
    new Discord.ActionRowBuilder().addComponents(patenteMenu),
    new Discord.ActionRowBuilder().addComponents(unidadeMenu),
    new Discord.ActionRowBuilder().addComponents(enviarButton)
  ];
}

async function replyEphemeral(interaction, content) {
  if (interaction.replied || interaction.deferred) {
    return interaction.followUp({
      content,
      flags: Discord.MessageFlags.Ephemeral
    });
  }

  return interaction.reply({
    content,
    flags: Discord.MessageFlags.Ephemeral
  });
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
      new Discord.ActionRowBuilder().addComponents(permissao)
    );

    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === 'registro_modal') {
    const nome = interaction.fields.getTextInputValue('registro_nome');
    const idJogo = interaction.fields.getTextInputValue('registro_id');
    const permissao = interaction.fields.getTextInputValue('registro_permissao');

    try {
      await runQuery(
        `INSERT OR REPLACE INTO registros_pendentes
        (usuario_id, canal_id, nome, id_jogo, patente, unidade, permissao, status, criado_em)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pendente', ?)`,
        [
          interaction.user.id,
          interaction.channel.id,
          nome,
          idJogo,
          null,
          null,
          permissao,
          Date.now()
        ]
      );

      return interaction.reply({
        content: 'Selecione sua patente e sua unidade abaixo para concluir o registro.',
        embeds: [
          buildResumoEmbed(interaction.user, {
            nome,
            id_jogo: idJogo,
            patente: null,
            unidade: null,
            permissao
          })
        ],
        components: buildPainelSelecao(interaction.user.id),
        flags: Discord.MessageFlags.Ephemeral
      });
    } catch (err) {
      console.error(err);
      return replyEphemeral(interaction, '❌ | Ocorreu um erro ao salvar seu registro.');
    }
  }

  if (
    interaction.isStringSelectMenu() &&
    (interaction.customId.startsWith('registro_patente:') ||
      interaction.customId.startsWith('registro_unidade:'))
  ) {
    const [, targetUserId] = interaction.customId.split(':');

    if (interaction.user.id !== targetUserId) {
      return replyEphemeral(interaction, '❌ | Este painel não pertence a você.');
    }

    try {
      const registroAtual = await getRegistro(interaction.user.id);

      if (!registroAtual) {
        return replyEphemeral(interaction, '❌ | Registro não encontrado. Abra o painel novamente.');
      }

      let novaPatente = registroAtual.patente;
      let novaUnidade = registroAtual.unidade;

      if (interaction.customId.startsWith('registro_patente:')) {
        novaPatente = interaction.values[0];
      }

      if (interaction.customId.startsWith('registro_unidade:')) {
        novaUnidade = interaction.values[0];
      }

      await runQuery(
        'UPDATE registros_pendentes SET patente = ?, unidade = ? WHERE usuario_id = ?',
        [novaPatente, novaUnidade, interaction.user.id]
      );

      return interaction.update({
        content: 'Selecione sua patente e sua unidade abaixo para concluir o registro.',
        embeds: [
          buildResumoEmbed(interaction.user, {
            nome: registroAtual.nome,
            id_jogo: registroAtual.id_jogo,
            patente: novaPatente,
            unidade: novaUnidade,
            permissao: registroAtual.permissao
          })
        ],
        components: buildPainelSelecao(interaction.user.id, novaPatente, novaUnidade)
      });
    } catch (err) {
      console.error(err);
      return replyEphemeral(interaction, '❌ | Ocorreu um erro ao atualizar seu registro.');
    }
  }

  if (interaction.isButton() && interaction.customId.startsWith('registro_enviar:')) {
    const [, targetUserId] = interaction.customId.split(':');

    if (interaction.user.id !== targetUserId) {
      return replyEphemeral(interaction, '❌ | Este painel não pertence a você.');
    }

    try {
      const data = await getRegistro(interaction.user.id);

      if (!data) {
        return replyEphemeral(interaction, '❌ | Registro não encontrado. Abra o painel novamente.');
      }

      if (!data.patente || !data.unidade) {
        return replyEphemeral(interaction, '❌ | Selecione a patente e a unidade antes de enviar.');
      }

      const canalAprovacao = interaction.guild.channels.cache.get(config.REGISTRO?.canal_aprovacao);

      if (!canalAprovacao) {
        return replyEphemeral(interaction, '❌ | O canal de aprovação do registro não foi configurado.');
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
        components: [row]
      });

      await runQuery(
        'UPDATE registros_pendentes SET mensagem_aprovacao_id = ?, canal_id = ?, status = ? WHERE usuario_id = ?',
        [mensagem.id, interaction.channel.id, 'pendente', interaction.user.id]
      );

      return interaction.update({
        content: '✅ | Seu registro foi enviado para aprovação.',
        embeds: [buildResumoEmbed(interaction.user, data)],
        components: []
      });
    } catch (err) {
      console.error(err);
      return replyEphemeral(interaction, '❌ | Ocorreu um erro ao enviar seu registro.');
    }
  }

  if (
    interaction.isButton() &&
    (interaction.customId.startsWith('registro_aceitar:') ||
      interaction.customId.startsWith('registro_recusar:'))
  ) {
    if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.ManageRoles)) {
      return replyEphemeral(interaction, '❌ | Você não possui permissão para gerenciar registros.');
    }

    const [acao, userId] = interaction.customId.split(':');

    try {
      const row = await getRegistro(userId);

      if (!row) {
        return replyEphemeral(interaction, '❌ | Registro não encontrado ou já processado.');
      }

      const membro = await interaction.guild.members.fetch(userId).catch(() => null);

      if (!membro) {
        return replyEphemeral(interaction, '❌ | Não foi possível localizar o membro no servidor.');
      }

      if (acao === 'registro_aceitar') {
        const cargosAdicionar = [];

        if (config.REGISTRO?.cargo_fixo) cargosAdicionar.push(config.REGISTRO.cargo_fixo);

        const rolePatente = patenteRoleId(row.patente);
        const roleUnidade = unidadeRoleId(row.unidade);

        if (rolePatente) cargosAdicionar.push(rolePatente);
        if (roleUnidade) cargosAdicionar.push(roleUnidade);

        try {
          if (config.REGISTRO?.cargo_sem_funcional) {
            await membro.roles.remove(config.REGISTRO.cargo_sem_funcional).catch(() => null);
          }

          if (cargosAdicionar.length > 0) {
            await membro.roles.add(cargosAdicionar);
          }

          const novoNick = buildNick(row.patente, row.nome, row.id_jogo);
          await membro.setNickname(novoNick).catch(() => null);
        } catch (roleError) {
          console.error(roleError);
          return replyEphemeral(
            interaction,
            '❌ | Não foi possível adicionar os cargos ou alterar o nick. Verifique a hierarquia do bot.'
          );
        }

        const aprovado = new Discord.EmbedBuilder()
          .setColor(config.embedcolor || 0x2b2d31)
          .setTitle('Registro Aprovado')
          .setDescription(`${membro} teve o registro aprovado com sucesso.`)
          .addFields(
            { name: 'Nome', value: row.nome || 'Não informado', inline: true },
            { name: 'ID', value: row.id_jogo || 'Não informado', inline: true },
            { name: 'Patente', value: row.patente || 'Não selecionada', inline: true },
            { name: 'Unidade', value: row.unidade || 'Não selecionada', inline: true },
            { name: 'Permissão', value: row.permissao || 'Não informada', inline: false },
            { name: 'Aprovado por', value: `${interaction.user}`, inline: false }
          );

        await interaction.update({
          content: `${membro}`,
          embeds: [aprovado],
          components: []
        });

        await membro.send({ embeds: [aprovado] }).catch(() => null);

        await runQuery(
          'UPDATE registros_pendentes SET status = ? WHERE usuario_id = ?',
          ['aprovado', userId]
        );

        return;
      }

      const recusado = new Discord.EmbedBuilder()
        .setColor(config.embedcolor || 0x2b2d31)
        .setTitle('Registro Recusado')
        .setDescription(`${membro} teve o registro recusado.`)
        .addFields(
          { name: 'Nome', value: row.nome || 'Não informado', inline: true },
          { name: 'ID', value: row.id_jogo || 'Não informado', inline: true },
          { name: 'Patente', value: row.patente || 'Não selecionada', inline: true },
          { name: 'Unidade', value: row.unidade || 'Não selecionada', inline: true },
          { name: 'Permissão', value: row.permissao || 'Não informada', inline: false },
          { name: 'Recusado por', value: `${interaction.user}`, inline: false }
        );

      await interaction.update({
        content: `${membro}`,
        embeds: [recusado],
        components: []
      });

      await membro.send({ embeds: [recusado] }).catch(() => null);

      await runQuery(
        'UPDATE registros_pendentes SET status = ? WHERE usuario_id = ?',
        ['recusado', userId]
      );
    } catch (err) {
      console.error(err);
      return replyEphemeral(interaction, '❌ | Ocorreu um erro ao processar o registro.');
    }
  }
};
