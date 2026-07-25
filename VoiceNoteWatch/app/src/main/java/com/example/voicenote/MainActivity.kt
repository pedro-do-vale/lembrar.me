package com.example.voicenote

import android.Manifest
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.voicenote.databinding.ActivityMainBinding
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var speechRecognizer: SpeechRecognizer
    private lateinit var recognizerIntent: Intent
    private var isListening = false
    private lateinit var notesAdapter: NotesAdapter
    private val notesList = mutableListOf<Note>()
    private val db = FirebaseFirestore.getInstance()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupRecyclerView()
        listenToCloudNotes()

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.RECORD_AUDIO), 1)
        }

        setupSpeechRecognizer()

        binding.btnRecord.setOnClickListener {
            if (isListening) {
                speechRecognizer.stopListening()
            } else {
                startListening()
            }
        }

        binding.btnOpenList.setOnClickListener {
            binding.layoutRecord.visibility = View.GONE
            binding.layoutList.visibility = View.VISIBLE
        }

        binding.btnCloseList.setOnClickListener {
            binding.layoutList.visibility = View.GONE
            binding.layoutRecord.visibility = View.VISIBLE
        }
    }

    private fun setupRecyclerView() {
        notesAdapter = NotesAdapter(notesList, 
            onDeleteClick = { noteToDelete -> deleteNote(noteToDelete) },
            onToggleComplete = { noteToToggle -> toggleNoteComplete(noteToToggle) }
        )
        binding.recyclerViewNotes.apply {
            layoutManager = LinearLayoutManager(this@MainActivity)
            adapter = notesAdapter
        }
    }

    private fun listenToCloudNotes() {
        db.collection("notes")
            .orderBy("timestamp", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshots, e ->
                if (e != null) {
                    Toast.makeText(this, "Erro de Sincronização", Toast.LENGTH_SHORT).show()
                    return@addSnapshotListener
                }

                if (snapshots != null) {
                    notesList.clear()
                    val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager

                    for (doc in snapshots.documents) {
                        val text = doc.getString("text") ?: ""
                        val date = doc.getString("date") ?: ""
                        // Para to-do list, usamos "archived" como "concluída" para mapear com a web
                        val isArchived = doc.getBoolean("archived") ?: false
                        val isSynced = !doc.metadata.hasPendingWrites()
                        
                        // Lógica de Lembretes Nativos
                        val reminderAt = doc.getLong("reminderAt")
                        val intent = Intent(this@MainActivity, NotificationReceiver::class.java).apply {
                            putExtra("taskName", text)
                            putExtra("taskId", doc.id)
                        }
                        
                        val pendingIntent = PendingIntent.getBroadcast(
                            this@MainActivity,
                            doc.id.hashCode(),
                            intent,
                            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                        )

                        if (reminderAt != null && reminderAt > System.currentTimeMillis() && !isArchived) {
                            alarmManager.setExactAndAllowWhileIdle(
                                AlarmManager.RTC_WAKEUP,
                                reminderAt,
                                pendingIntent
                            )
                        } else {
                            alarmManager.cancel(pendingIntent) // Cancela alarmes velhos ou arquivados
                        }

                        notesList.add(Note(doc.id, text, date, isSynced, completed = isArchived))
                    }
                    notesAdapter.notifyDataSetChanged()
                }
            }
    }

    private fun toggleNoteComplete(note: Note) {
        val newState = !note.completed
        note.completed = newState
        notesAdapter.notifyDataSetChanged()
        db.collection("notes").document(note.id).update("archived", newState)
    }

    private fun deleteNote(note: Note) {
        db.collection("notes").document(note.id)
            .delete()
            .addOnSuccessListener {
                Toast.makeText(this, "Excluído", Toast.LENGTH_SHORT).show()
            }
    }

    private fun setupSpeechRecognizer() {
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
        recognizerIntent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
        }

        speechRecognizer.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {
                binding.tvStatus.text = getString(R.string.listening)
            }
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {
                resetUI()
            }
            override fun onError(error: Int) {
                resetUI()
            }
            override fun onResults(results: Bundle?) {
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                if (!matches.isNullOrEmpty()) {
                    val text = matches[0]
                    saveNote(text)
                }
                resetUI()
            }
            override fun onPartialResults(partialResults: Bundle?) {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
    }

    private fun startListening() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            isListening = true
            binding.btnRecord.setBackgroundResource(R.drawable.circle_neon_recording)
            binding.btnRecord.setColorFilter(android.graphics.Color.parseColor("#FF1744"))
            speechRecognizer.startListening(recognizerIntent)
        } else {
            Toast.makeText(this, R.string.permission_required, Toast.LENGTH_SHORT).show()
        }
    }

    private fun resetUI() {
        isListening = false
        binding.tvStatus.text = getString(R.string.press_to_speak)
        binding.btnRecord.setBackgroundResource(R.drawable.circle_neon_idle)
        binding.btnRecord.setColorFilter(android.graphics.Color.parseColor("#00E5FF"))
    }

    private fun saveNote(rawText: String) {
        var text = rawText
        var targetList = ""
        
        // Extração de comando NLP (Roteamento de Quadros)
        val lowerText = text.lowercase(Locale.getDefault())
        val index = lowerText.lastIndexOf(" lista ")
        if (index != -1) {
            targetList = text.substring(index + 7).trim()
            text = text.substring(0, index).trim()
        }

        val uppercaseText = text.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() }
        val dateFormater = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())
        val dateStr = dateFormater.format(Date())
        
        val noteMap = hashMapOf<String, Any>(
            "text" to uppercaseText,
            "date" to dateStr,
            "timestamp" to System.currentTimeMillis(),
            "archived" to false
        )

        if (targetList.isNotEmpty()) {
            val formattedTarget = targetList.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() }
            noteMap["targetList"] = formattedTarget
        }

        db.collection("notes").add(noteMap)
            .addOnSuccessListener {
                Toast.makeText(this, "Sincronizado", Toast.LENGTH_SHORT).show()
            }
            .addOnFailureListener {
                Toast.makeText(this, "Salvo offline na fila", Toast.LENGTH_SHORT).show()
            }
    }

    override fun onDestroy() {
        super.onDestroy()
        speechRecognizer.destroy()
    }
}
