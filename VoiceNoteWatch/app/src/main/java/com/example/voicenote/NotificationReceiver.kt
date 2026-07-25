package com.example.voicenote

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat

class NotificationReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val taskName = intent.getStringExtra("taskName") ?: "Lembrete: Você tem uma tarefa agora!"
        val taskId = intent.getStringExtra("taskId") ?: "12345"

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "lembrarme_channel_id"

        // Create the NotificationChannel, but only on API 26+ because
        // the NotificationCompat channel constructor won't do it automatically for the Manager.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Lembretes de Tarefas"
            val descriptionText = "Acorda o relógio para notificar as tarefas programadas"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(channelId, name, importance).apply {
                description = descriptionText
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 200, 500)
            }
            notificationManager.createNotificationChannel(channel)
        }

        val defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        val notificationBuilder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_app_icon) // System fallback if custom not provided in res
            .setContentTitle("Lembrar.me: Atividade!")
            .setContentText(taskName)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setSound(defaultSoundUri)
            .setVibrate(longArrayOf(0, 500, 200, 500))
            .setAutoCancel(true)

        // Generating a unique ID from hashcode so notifications don't overwrite each other if they fire at same time
        notificationManager.notify(taskId.hashCode(), notificationBuilder.build())
    }
}
