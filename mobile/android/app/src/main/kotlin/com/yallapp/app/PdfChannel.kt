package com.yallapp.app

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.os.Handler
import android.os.Looper
import android.os.ParcelFileDescriptor
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.MethodChannel
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.UUID
import java.util.concurrent.Executors

/**
 * 53 The app's own PDF viewer (lib/core/services/pdf_pages.dart): course
 * files drawn page by page with Android's PdfRenderer, so they never go to
 * another app. The document arrives in memory and is written to the app's
 * private cache only to be opened: the file is deleted as soon as the
 * renderer holds it (and any left over at the next start).
 *
 * Methods on `yallapp/pdf`: `open` {bytes} -> {id, pages}, `render`
 * {id, page, width} -> PNG bytes, `close` {id}.
 */
class PdfChannel(private val context: Context, messenger: BinaryMessenger) {
    private val channel = MethodChannel(messenger, "yallapp/pdf")
    private val worker = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())
    private val documents = HashMap<Int, PdfRenderer>()
    private var nextId = 1

    init {
        worker.execute { folder().listFiles()?.forEach { it.delete() } }
        channel.setMethodCallHandler { call, result ->
            when (call.method) {
                "open" -> {
                    val bytes = call.argument<ByteArray>("bytes")
                    if (bytes == null) {
                        result.success(null)
                    } else {
                        run(result) { open(bytes) }
                    }
                }
                "render" -> {
                    val id = call.argument<Int>("id") ?: 0
                    val page = call.argument<Int>("page") ?: 0
                    val width = (call.argument<Int>("width") ?: 1080).coerceIn(100, 4000)
                    run(result) { render(id, page, width) }
                }
                "close" -> {
                    val id = call.argument<Int>("id") ?: 0
                    run(result) {
                        documents.remove(id)?.close()
                        null
                    }
                }
                else -> result.notImplemented()
            }
        }
    }

    /** Runs [work] off the main thread, one at a time (PdfRenderer isn't thread-safe). */
    private fun run(result: MethodChannel.Result, work: () -> Any?) {
        worker.execute {
            val value =
                try {
                    work()
                } catch (e: Exception) {
                    null
                }
            main.post { result.success(value) }
        }
    }

    private fun folder(): File = File(context.cacheDir, "yallapp_view").apply { mkdirs() }

    private fun open(bytes: ByteArray): Map<String, Int>? {
        val file = File(folder(), UUID.randomUUID().toString())
        try {
            file.writeBytes(bytes)
            val descriptor = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
            val renderer =
                try {
                    PdfRenderer(descriptor)
                } catch (e: Exception) {
                    descriptor.close()
                    return null
                }
            val id = nextId++
            documents[id] = renderer
            return mapOf("id" to id, "pages" to renderer.pageCount)
        } finally {
            // The renderer keeps the open descriptor; nothing stays on disk.
            file.delete()
        }
    }

    private fun render(id: Int, index: Int, width: Int): ByteArray? {
        val renderer = documents[id] ?: return null
        if (index < 0 || index >= renderer.pageCount) return null
        renderer.openPage(index).use { page ->
            val height = (width.toLong() * page.height / page.width.coerceAtLeast(1)).toInt().coerceIn(1, 8000)
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            bitmap.eraseColor(Color.WHITE)
            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
            val out = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
            bitmap.recycle()
            return out.toByteArray()
        }
    }
}
