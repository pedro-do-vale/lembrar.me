package com.example.voicenote

import android.graphics.Color
import android.graphics.Paint
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

data class Note(val id: String, val text: String, val date: String, var isSynced: Boolean = false, var completed: Boolean = false)

class NotesAdapter(
    private val notes: List<Note>,
    private val onDeleteClick: (Note) -> Unit,
    private val onToggleComplete: (Note) -> Unit
) : RecyclerView.Adapter<NotesAdapter.NoteViewHolder>() {

    class NoteViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvText: TextView = view.findViewById(R.id.tvNoteText)
        val tvDate: TextView = view.findViewById(R.id.tvNoteDate)
        val ivSyncStatus: ImageView = view.findViewById(R.id.ivSyncStatus)
        val btnDelete: ImageView = view.findViewById(R.id.btnDelete)
        val btnToggleComplete: ImageView = view.findViewById(R.id.btnToggleComplete)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): NoteViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_note, parent, false)
        return NoteViewHolder(view)
    }

    override fun onBindViewHolder(holder: NoteViewHolder, position: Int) {
        val note = notes[position]
        holder.tvText.text = note.text
        holder.tvDate.text = note.date
        
        if (note.isSynced) {
            holder.ivSyncStatus.setColorFilter(Color.parseColor("#4CAF50")) // Green
        } else {
            holder.ivSyncStatus.setColorFilter(Color.parseColor("#757575")) // Gray
        }
        
        if (note.completed) {
            holder.btnToggleComplete.setImageResource(android.R.drawable.checkbox_on_background)
            holder.tvText.paintFlags = holder.tvText.paintFlags or Paint.STRIKE_THRU_TEXT_FLAG
            holder.tvText.setTextColor(Color.parseColor("#888888"))
        } else {
            holder.btnToggleComplete.setImageResource(android.R.drawable.checkbox_off_background)
            holder.tvText.paintFlags = holder.tvText.paintFlags and Paint.STRIKE_THRU_TEXT_FLAG.inv()
            holder.tvText.setTextColor(Color.WHITE)
        }

        holder.btnToggleComplete.setOnClickListener {
            onToggleComplete(note)
        }

        holder.btnDelete.setOnClickListener {
            onDeleteClick(note)
        }
    }

    override fun getItemCount() = notes.size
}
