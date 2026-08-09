const mongoose = require('mongoose');

const HistoryStateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actionIndex: {
      type: Number,
      required: true,
    },
    actionType: {
      type: String,
      enum: ['ADD', 'EDIT', 'REPLACE', 'MOVE', 'DELETE'],
      required: true,
    },
    // We store the query/data needed to undo and redo the action
    undoData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    redoData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    isUndone: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.HistoryState || mongoose.model('HistoryState', HistoryStateSchema);
