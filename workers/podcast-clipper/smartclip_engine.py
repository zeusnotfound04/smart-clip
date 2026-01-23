import os
import sys
import time
import subprocess
from typing import Optional, Dict, Any, List, Tuple, Callable
from dataclasses import dataclass
import tempfile

import cv2
import numpy as np

@dataclass
class FaceDetection:
    """Detected face with bounding box"""
    x: int
    y: int
    w: int
    h: int
    confidence: float
    center_x: float  # Normalized 0-1

@dataclass
class Speaker:
    """Identified speaker"""
    id: int
    x_position: float  # Normalized 0-1 (0=left, 1=right)
    face_regions: List[Tuple[int, int, int, int]]  # Sample bounding boxes

@dataclass
class TimelineSegment:
    """Video segment with speaker/layout info"""
    start_frame: int
    end_frame: int
    mode: str  # 'single' or 'split'
    active_speaker: Optional[int] = None
    crop_x: Optional[int] = None
    crop_y: Optional[int] = None
    crop_w: Optional[int] = None
    crop_h: Optional[int] = None

@dataclass
class ProcessingResult:
    """Result of video processing"""
    output_path: str
    speakers_detected: int
    layout_mode: str
    processing_time_ms: int
    subtitle_path: Optional[str] = None

class YuNetFaceDetector:
    """ONNX-based face detection using YuNet model"""
    
    def __init__(self, models_dir: str):
        self.models_dir = models_dir
        self.detector = None
        self._load_model()
    
    def _load_model(self):
        """Load YuNet ONNX model"""
        model_path = os.path.join(self.models_dir, 'face_detection_yunet_2023mar.onnx')
        
        if not os.path.exists(model_path):
            print(f"⚠️ YuNet model not found at {model_path}")
            print("   Downloading model...")
            self._download_model(model_path)
        
        # OpenCV DNN face detector
        self.detector = cv2.FaceDetectorYN.create(
            model_path,
            "",
            (320, 320),
            0.6,  # Score threshold
            0.3,  # NMS threshold
            5000  # Top K
        )
        print("✅ YuNet face detector loaded")
    
    def _download_model(self, path: str):
        """Download YuNet model from OpenCV zoo"""
        import urllib.request
        url = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
        os.makedirs(os.path.dirname(path), exist_ok=True)
        urllib.request.urlretrieve(url, path)
        print(f"✅ Model downloaded to {path}")
    
    def detect(self, frame: np.ndarray) -> List[FaceDetection]:
        """Detect faces in a frame"""
        if self.detector is None:
            return []
        
        h, w = frame.shape[:2]
        self.detector.setInputSize((w, h))
        
        _, faces = self.detector.detect(frame)
        
        if faces is None:
            return []
        
        detections = []
        for face in faces:
            x, y, fw, fh = int(face[0]), int(face[1]), int(face[2]), int(face[3])
            confidence = float(face[-1])
            center_x = (x + fw / 2) / w
            
            detections.append(FaceDetection(
                x=x, y=y, w=fw, h=fh,
                confidence=confidence,
                center_x=center_x
            ))
        
        return detections

class SubtitleGenerator:
    """Generate viral-style ASS subtitles"""
    
    STYLES = {
        'chris_cinematic': {
            'font': 'Montserrat Black',
            'size': 105,
            'primary': (255, 255, 255),  # White
            'highlight': (0, 255, 90),   # Green
            'border': 8,  # Thick border for 3D effect
            'shadow': 4,  # Strong shadow for 3D depth
            'shadow_color': (20, 20, 20),  # Dark shadow
            'shadow_alpha': 200,  # Strong shadow visibility
            'scale_normal': 90,
            'scale_highlight': 120,
            'italic': False,
            'animation_type': 'scale_color',  # Scale + color change
        },
        'clean_pop': {
            # Clean modern style with italic text and soft shadows
            # Inspired by viral TikTok/Reels captions
            'font': 'Outfit',  # Modern, clean sans-serif
            'size': 95,
            'primary': (255, 255, 255),  # Pure white
            'highlight': (255, 255, 255),  # Keep white (brightness boost via scale)
            'border': 0,  # No outline - clean look
            'shadow': 8,  # Soft drop shadow for depth
            'shadow_color': (0, 0, 0),  # Black shadow
            'shadow_alpha': 80,  # Semi-transparent shadow
            'scale_normal': 100,
            'scale_highlight': 115,  # Pop effect on highlight
            'italic': True,  # Slanted text style
            'animation_type': 'pop_in',  # Words pop in with scale bounce
            'blur_edge': True,  # Soft shadow edges
            'spacing': 2,  # Letter spacing
        },
        'minimal_lowercase': {
            # Ultra-clean minimal style - lowercase text with subtle shadow
            # Inspired by chris.cinematic podcast captions
            'font': 'Inter',  # Clean, highly readable sans-serif
            'size': 85,
            'primary': (255, 255, 255),  # Pure white
            'highlight': (255, 255, 255),  # Keep white (no color change)
            'border': 0,  # No outline - ultra clean
            'shadow': 4,  # Subtle drop shadow
            'shadow_color': (0, 0, 0),  # Black shadow
            'shadow_alpha': 120,  # More visible shadow for dark backgrounds
            'scale_normal': 100,
            'scale_highlight': 100,  # No scale change - static text
            'italic': False,  # Normal upright text
            'animation_type': 'fade_in',  # Simple fade animation
            'spacing': 1,  # Slight letter spacing
            'lowercase': True,  # Keep text lowercase (not uppercase)
        },
        'bold_emphasis': {
            # Bold two-tone style with red highlight - 3D effect
            # Inspired by chris.cinematic emphasis captions
            'font': 'Bebas Neue',  # Heavy, impactful display font
            'size': 110,
            'primary': (255, 255, 255),  # Pure white
            'highlight': (255, 50, 50),  # Vibrant red for emphasis
            'border': 6,  # Border for 3D effect
            'shadow': 5,  # Strong shadow for 3D depth
            'shadow_color': (30, 30, 30),  # Dark shadow
            'shadow_alpha': 180,  # Strong visibility
            'scale_normal': 100,
            'scale_highlight': 108,  # Slight punch on highlight
            'italic': False,  # Bold upright
            'animation_type': 'punch_return',  # Word turns red then returns to white
            'spacing': 3,  # Good letter spacing for readability
            'lowercase': False,  # UPPERCASE for impact
        },
        'karaoke_snap': {
            # Single word display - one word at a time, maximum impact
            # Inspired by fast-paced TikTok/Reels karaoke captions
            'font': 'Poppins',  # Clean, geometric sans-serif
            'size': 130,  # Large for single word impact
            'primary': (255, 255, 255),  # Pure white
            'highlight': (255, 255, 255),  # Keep white
            'border': 0,  # Clean look
            'shadow': 5,  # Subtle shadow
            'shadow_color': (0, 0, 0),  # Black shadow
            'shadow_alpha': 100,  # Moderate visibility
            'scale_normal': 100,
            'scale_highlight': 100,  # No scale change after snap
            'italic': False,  # Bold upright
            'animation_type': 'snap_in',  # Quick snap appearance
            'spacing': 4,  # Good letter spacing
            'lowercase': False,  # UPPERCASE for impact
            'words_per_display': 1,  # Single word at a time
            'center_vertical': True,  # Center in frame
        },
        'warm_italic': {
            # Warm italic style with green highlight
            # Inspired by chris.cinematic premium captions
            'font': 'Montserrat',  # Clean, versatile sans-serif
            'size': 100,
            'primary': (255, 255, 255),  # Pure white
            'highlight': (0, 230, 120),  # Fresh green highlight
            'border': 0,  # Clean look - no outline
            'shadow': 6,  # Good shadow for depth
            'shadow_color': (30, 30, 30),  # Dark gray shadow
            'shadow_alpha': 120,  # Visible shadow
            'scale_normal': 95,
            'scale_highlight': 105,  # Subtle scale boost on highlight
            'italic': True,  # Italic/slanted style
            'animation_type': 'glow_highlight',  # Smooth color glow transition
            'spacing': 2,  # Slight letter spacing
            'lowercase': False,  # UPPERCASE for impact
        }
    }
    
    def __init__(self, style_name: str = 'chris_cinematic'):
        self.style_name = style_name
        self.style = self.STYLES.get(style_name, self.STYLES['chris_cinematic'])
    
    def generate(
        self,
        audio_path: str,
        output_ass_path: str,
        video_width: int,
        video_height: int,
        layout_timeline: Optional[List[Dict]] = None,
        whisper_model: str = 'base'
    ) -> str:
        """
        Transcribe audio and generate ASS subtitle file
        """
        import whisper_timestamped as whisper
        
        print(f"🎙️ Transcribing with Whisper ({whisper_model})...")
        model = whisper.load_model(whisper_model)
        result = whisper.transcribe(model, audio_path, language="en")
        
        # Collect all words with timing
        words = []
        for segment in result.get('segments', []):
            for word in segment.get('words', []):
                words.append({
                    'text': word['text'],
                    'start': word['start'],
                    'end': word['end']
                })
        
        print(f"   Found {len(words)} words")
        
        # Generate ASS content
        ass_content = self._generate_ass(
            words, 
            video_width, 
            video_height,
            layout_timeline
        )
        
        with open(output_ass_path, 'w', encoding='utf-8') as f:
            f.write(ass_content)
        
        print(f"📄 Generated: {output_ass_path}")
        return output_ass_path
    
    def _rgb_to_ass(self, rgb: Tuple[int, int, int], alpha: int = 0) -> str:
        """Convert RGB to ASS color format (BGR with &H prefix)"""
        r, g, b = rgb
        return f"&H{alpha:02X}{b:02X}{g:02X}{r:02X}"
    
    def _generate_ass(
        self,
        words: List[Dict],
        video_width: int,
        video_height: int,
        layout_timeline: Optional[List[Dict]] = None
    ) -> str:
        """Generate ASS subtitle content with style-specific animations"""
        
        style = self.style
        font = style['font']
        size = style['size']
        primary_color = self._rgb_to_ass(style['primary'])
        highlight_color = self._rgb_to_ass(style['highlight'])
        black = self._rgb_to_ass((0, 0, 0))
        border = style['border']
        shadow = style['shadow']
        scale_normal = style['scale_normal']
        scale_highlight = style['scale_highlight']
        
        # New style properties with defaults
        italic = style.get('italic', False)
        animation_type = style.get('animation_type', 'scale_color')
        spacing = style.get('spacing', 4)
        shadow_alpha = style.get('shadow_alpha', 180)
        use_lowercase = style.get('lowercase', False)  # Keep text lowercase if True
        words_per_display_config = style.get('words_per_display', 5)  # Words shown at once
        center_vertical = style.get('center_vertical', False)  # Center in frame
        
        margin_v_single = int(video_height * 0.14)
        margin_v_split = int(video_height * 0.40)
        
        # Italic flag for ASS (1 = italic, 0 = normal)
        italic_flag = 1 if italic else 0
        
        # Shadow color with alpha
        shadow_color = self._rgb_to_ass(style.get('shadow_color', (0, 0, 0)), shadow_alpha)
        
        def get_mode_at_time(t: float) -> str:
            if not layout_timeline:
                return 'single'
            for seg in layout_timeline:
                if seg['start'] <= t <= seg['end']:
                    return seg.get('mode', 'single')
            return 'single'
        
        def format_time(seconds: float) -> str:
            h = int(seconds // 3600)
            m = int((seconds % 3600) // 60)
            s = seconds % 60
            return f"{h}:{m:02d}:{s:05.2f}"
        
        def smart_wrap(word_list, max_chars=14):
            lines = []
            current_line = []
            current_length = 0
            
            for word in word_list:
                word_len = len(word['text'])
                if current_length + word_len + (1 if current_line else 0) > max_chars and current_line:
                    lines.append(current_line)
                    current_line = [word]
                    current_length = word_len
                else:
                    current_line.append(word)
                    current_length += word_len + (1 if len(current_line) > 1 else 0)
            
            if current_line:
                lines.append(current_line)
            return lines
        
        # ASS header with dynamic italic and spacing
        ass_content = f"""[Script Info]
Title: SmartClip Subtitles
ScriptType: v4.00+
PlayResX: {video_width}
PlayResY: {video_height}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Bottom,{font},{size},{primary_color},{primary_color},{black},{shadow_color},1,{italic_flag},0,0,100,100,{spacing},0,1,{border},{shadow},2,50,50,{margin_v_single},1
Style: Center,{font},{size},{primary_color},{primary_color},{black},{shadow_color},1,{italic_flag},0,0,100,100,{spacing},0,1,{border},{shadow},2,50,50,{margin_v_split},1
Style: MiddleCenter,{font},{size},{primary_color},{primary_color},{black},{shadow_color},1,{italic_flag},0,0,100,100,{spacing},0,1,{border},{shadow},5,50,50,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
        
        # Process words in groups (read from style config)
        words_per_display = words_per_display_config
        
        for i in range(0, len(words), words_per_display):
            display_words = words[i:i + words_per_display]
            if not display_words:
                continue
            
            lines = smart_wrap(display_words, max_chars=14)
            
            chunk_start = display_words[0]['start']
            chunk_end = display_words[-1]['end']
            
            # For single word display, end exactly when next word starts (no overlap)
            if words_per_display == 1 and i + 1 < len(words):
                next_start = words[i + 1]['start']
                chunk_end = next_start  # End exactly when next word starts
            elif i + words_per_display < len(words):
                next_start = words[i + words_per_display]['start']
                chunk_end = min(chunk_end + 0.1, next_start - 0.05)
            else:
                chunk_end = chunk_end + 0.25
            
            # Minimum duration (but not for single word - keep it tight)
            if words_per_display > 1 and chunk_end - chunk_start < 0.5:
                chunk_end = chunk_start + 0.5
            
            mode = get_mode_at_time(chunk_start)
            # Select appropriate style based on layout and center_vertical setting
            if center_vertical:
                style_name = "MiddleCenter"  # Single word centered in frame
            elif mode == "split":
                style_name = "Center"
            else:
                style_name = "Bottom"
            
            line_texts = []
            for line_words in lines:
                word_parts = []
                for word in line_words:
                    # Apply text case based on style
                    if use_lowercase:
                        word_text = word['text'].strip()  # Keep original case (usually lowercase from Whisper)
                    else:
                        word_text = word['text'].upper()  # Convert to uppercase
                    word_start_ms = int((word['start'] - chunk_start) * 1000)
                    word_end_ms = int((word['end'] - chunk_start) * 1000)
                    
                    if word_end_ms - word_start_ms < 150:
                        word_end_ms = word_start_ms + 150
                    
                    # Animation timing
                    anim_in = 60
                    anim_out = 100
                    
                    # Generate word animation based on animation_type
                    if animation_type == 'pop_in':
                        # Clean pop-in animation: scale bounce effect, no color change
                        # Start small, pop to larger than normal, settle to normal
                        scale_start = scale_normal - 30  # Start smaller
                        scale_peak = scale_highlight + 10  # Overshoot
                        bounce_ms = 40  # Bounce timing
                        
                        word_with_anim = (
                            f"{{\\alpha&HFF&\\fscx{scale_start}\\fscy{scale_start}"
                            f"\\t({word_start_ms},{word_start_ms + anim_in},\\alpha&H00&\\fscx{scale_peak}\\fscy{scale_peak})"
                            f"\\t({word_start_ms + anim_in},{word_start_ms + anim_in + bounce_ms},\\fscx{scale_normal}\\fscy{scale_normal})"
                            f"}}{word_text}{{\\r}}"
                        )
                    elif animation_type == 'scale_color':
                        # Original chris_cinematic style: scale + color change
                        word_with_anim = (
                            f"{{\\c{primary_color}\\fscx{scale_normal}\\fscy{scale_normal}"
                            f"\\t({word_start_ms},{word_start_ms + anim_in},\\c{highlight_color}\\fscx{scale_highlight}\\fscy{scale_highlight})"
                            f"\\t({word_end_ms},{word_end_ms + anim_out},\\c{primary_color}\\fscx{scale_normal}\\fscy{scale_normal})"
                            f"}}{word_text}{{\\r}}"
                        )
                    elif animation_type == 'fade_in':
                        # Minimal style: simple fade in, no scale change
                        # Words appear with a gentle fade
                        fade_duration = 80
                        word_with_anim = (
                            f"{{\\alpha&HFF&"
                            f"\\t({word_start_ms},{word_start_ms + fade_duration},\\alpha&H00&)"
                            f"}}{word_text}{{\\r}}"
                        )
                    elif animation_type == 'punch_highlight':
                        # Bold emphasis style: word punches in with color change
                        # Starts white, turns RED with scale punch, stays red
                        punch_in = 50  # Quick punch
                        punch_settle = 80  # Settle time
                        
                        word_with_anim = (
                            f"{{\\c{primary_color}\\fscx{scale_normal}\\fscy{scale_normal}"
                            f"\\t({word_start_ms},{word_start_ms + punch_in},"
                            f"\\c{highlight_color}\\fscx{scale_highlight}\\fscy{scale_highlight})"
                            f"\\t({word_start_ms + punch_in},{word_start_ms + punch_in + punch_settle},"
                            f"\\fscx{scale_normal}\\fscy{scale_normal})"
                            f"}}{word_text}{{\\r}}"
                        )
                    elif animation_type == 'punch_return':
                        # Bold emphasis style: word turns RED then returns to WHITE
                        # Only active word is red, rest stay white
                        punch_in = 50  # Quick punch to red
                        hold_duration = word_end_ms - word_start_ms - punch_in  # Hold red while speaking
                        punch_out = 80  # Return to white
                        
                        word_with_anim = (
                            f"{{\\c{primary_color}\\fscx{scale_normal}\\fscy{scale_normal}"
                            f"\\t({word_start_ms},{word_start_ms + punch_in},"
                            f"\\c{highlight_color}\\fscx{scale_highlight}\\fscy{scale_highlight})"
                            f"\\t({word_end_ms},{word_end_ms + punch_out},"
                            f"\\c{primary_color}\\fscx{scale_normal}\\fscy{scale_normal})"
                            f"}}{word_text}{{\\r}}"
                        )
                    elif animation_type == 'snap_in':
                        # Karaoke snap style: word appears instantly at full size
                        # For single word display - no animation overlap issues
                        # Word is invisible until its time, then snaps to full size
                        word_with_anim = (
                            f"{{\\fscx{scale_normal}\\fscy{scale_normal}}}{word_text}{{\\r}}"
                        )
                    elif animation_type == 'glow_highlight':
                        # Warm glow style: smooth color transition with scale
                        # Word glows to highlight color with subtle scale boost
                        glow_in = 80  # Smooth transition in
                        glow_hold = 100  # Hold the glow
                        glow_out = 120  # Smooth fade back
                        
                        word_with_anim = (
                            f"{{\\c{primary_color}\\fscx{scale_normal}\\fscy{scale_normal}"
                            f"\\t({word_start_ms},{word_start_ms + glow_in},"
                            f"\\c{highlight_color}\\fscx{scale_highlight}\\fscy{scale_highlight})"
                            f"\\t({word_end_ms},{word_end_ms + glow_out},"
                            f"\\c{primary_color}\\fscx{scale_normal}\\fscy{scale_normal})"
                            f"}}{word_text}{{\\r}}"
                        )
                    else:
                        # Default: simple display with no animation
                        word_with_anim = f"{word_text}"
                    
                    word_parts.append(word_with_anim)
                
                line_texts.append(" ".join(word_parts))
            
            stacked_text = "\\N".join(line_texts)
            
            start_str = format_time(chunk_start)
            end_str = format_time(chunk_end)
            
            ass_content += f"Dialogue: 0,{start_str},{end_str},{style_name},,0,0,0,,{stacked_text}\n"
        
        return ass_content

class SmartClipEngine:
    """
    Main video processing engine
    """
    
    def __init__(
        self,
        models_dir: str = './models',
        temp_dir: str = './temp',
        output_dir: str = './output'
    ):
        self.models_dir = models_dir
        self.temp_dir = temp_dir
        self.output_dir = output_dir
        
        os.makedirs(models_dir, exist_ok=True)
        os.makedirs(temp_dir, exist_ok=True)
        os.makedirs(output_dir, exist_ok=True)
        
        self.face_detector = YuNetFaceDetector(models_dir)
        self.subtitle_gen = SubtitleGenerator()
    
    def process(
        self,
        input_path: str,
        output_path: str,
        start_time: float = 0,
        end_time: float = 300,
        subtitle_style: Optional[str] = 'chris_cinematic',
        whisper_model: str = 'base',
        progress_callback: Optional[Callable[[float, str], None]] = None
    ) -> Dict[str, Any]:
        """
        Process a video clip
        """
        start_timestamp = time.time()
        
        def report(progress: float, message: str):
            print(f"   [{int(progress*100):3d}%] {message}")
            if progress_callback:
                progress_callback(progress, message)
        
        report(0.0, "Loading video...")
        
        # Open video
        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            raise Exception(f"Cannot open video: {input_path}")
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        start_frame = int(start_time * fps)
        end_frame = min(int(end_time * fps), total_frames)
        clip_frames = end_frame - start_frame
        
        report(0.05, f"Clip: {start_time:.1f}s - {end_time:.1f}s ({clip_frames} frames)")
        
        report(0.1, "Analyzing faces...")
        
        face_detections = []
        sample_interval = max(1, clip_frames // 50)  # Sample ~50 frames
        
        frame_idx = 0
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
        
        while frame_idx < clip_frames:
            ret, frame = cap.read()
            if not ret:
                break
            
            if frame_idx % sample_interval == 0:
                # Resize for faster detection
                small = cv2.resize(frame, (640, 360))
                faces = self.face_detector.detect(small)
                
                for face in faces:
                    face_detections.append({
                        'frame': frame_idx,
                        'center_x': face.center_x,
                        'confidence': face.confidence
                    })
            
            frame_idx += 1
            
            if frame_idx % 100 == 0:
                report(0.1 + 0.2 * (frame_idx / clip_frames), f"Scanning frame {frame_idx}/{clip_frames}")
        
        report(0.3, "Identifying speakers...")
        
        speakers = []
        if face_detections:
            # Cluster face X positions
            x_positions = [d['center_x'] for d in face_detections]
            
            # Simple clustering: left half vs right half
            left_faces = [x for x in x_positions if x < 0.5]
            right_faces = [x for x in x_positions if x >= 0.5]
            
            if left_faces:
                avg_left = sum(left_faces) / len(left_faces)
                speakers.append(Speaker(id=0, x_position=avg_left, face_regions=[]))
            
            if right_faces:
                avg_right = sum(right_faces) / len(right_faces)
                speakers.append(Speaker(id=1, x_position=avg_right, face_regions=[]))
        
        num_speakers = len(speakers)
        is_split = num_speakers >= 2
        layout_mode = 'split' if is_split else 'single'
        
        report(0.35, f"Detected {num_speakers} speaker(s), mode: {layout_mode}")

        report(0.4, "Generating crop timeline...")
        
        
        timeline = [{
            'start': start_time,
            'end': end_time,
            'mode': layout_mode,
            'speakers': num_speakers
        }]
        
        report(0.45, "Rendering video...")
        
        temp_video = os.path.join(self.temp_dir, 'temp_clip.mp4')
        duration = end_time - start_time
        
        if is_split:
            # Split screen: side by side speakers
            if num_speakers >= 2:
                s0 = speakers[0].x_position
                s1 = speakers[1].x_position
                
                # Determine left/right
                if s0 < s1:
                    left_x = s0
                    right_x = s1
                else:
                    left_x = s1
                    right_x = s0
                
                # Calculate crop regions
                crop_w = width // 2
                crop_h = height
                
                left_crop_x = int(left_x * width - crop_w // 2)
                right_crop_x = int(right_x * width - crop_w // 2)
                
                left_crop_x = max(0, min(left_crop_x, width - crop_w))
                right_crop_x = max(0, min(right_crop_x, width - crop_w))
                
                # FFmpeg split screen filter (no trim)
                filter_complex = (
                    f"[0:v]crop={crop_w}:{crop_h}:{left_crop_x}:0[left];"
                    f"[0:v]crop={crop_w}:{crop_h}:{right_crop_x}:0[right];"
                    f"[left][right]vstack=inputs=2,scale=1080:1920[v]"
                )
            else:
                # Single speaker - center crop
                filter_complex = self._single_speaker_filter(width, height)
        else:
            # Single speaker mode - center on speaker
            filter_complex = self._single_speaker_filter(width, height)
        
        # Run FFmpeg with Input Seeking (faster and safe for filters)
        cmd = [
            'ffmpeg', '-y',
            '-ss', str(start_time),
            '-t', str(duration),
            '-i', input_path,
            '-filter_complex', filter_complex,
            '-map', '[v]',
            '-map', '0:a?',
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '18',
            '-c:a', 'aac',
            '-b:a', '192k',
            temp_video
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"⚠️ FFmpeg Error: {result.stderr}")
            # Fallback: simple copy/scale without advanced crop
            cmd = [
                'ffmpeg', '-y',
                '-ss', str(start_time),
                '-t', str(duration),
                '-i', input_path,
                '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '18',
                '-c:a', 'aac',
                '-b:a', '192k',
                temp_video
            ]
            subprocess.run(cmd, check=True, capture_output=True)
        
        report(0.6, "Video rendered")
        
        ass_path = None
        if subtitle_style:
            report(0.65, "Generating subtitles...")
            
            # Extract audio
            temp_audio = os.path.join(self.temp_dir, 'temp_audio.wav')
            cmd = [
                'ffmpeg', '-y',
                '-i', temp_video,
                '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
                temp_audio
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            
            # Subtitle timeline should be relative to 0 (since temp_video starts at 0)
            subtitle_timeline = [{
                'start': 0, 
                'end': duration, 
                'mode': layout_mode
            }]
            
            # Generate subtitles
            self.subtitle_gen = SubtitleGenerator(subtitle_style)
            ass_path = os.path.join(self.temp_dir, 'subtitles.ass')
            
            self.subtitle_gen.generate(
                audio_path=temp_audio,
                output_ass_path=ass_path,
                video_width=1080,
                video_height=1920,
                layout_timeline=subtitle_timeline,
                whisper_model=whisper_model
            )
            
            # Clean up audio
            os.remove(temp_audio)
            
            report(0.8, "Burning subtitles...")
            
            # Burn subtitles
            ass_escaped = ass_path.replace('\\', '/').replace(':', '\\:')
            cmd = [
                'ffmpeg', '-y',
                '-i', temp_video,
                '-vf', f"ass='{ass_escaped}'",
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '18',
                '-c:a', 'copy',
                output_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                # Try subtitles filter
                cmd = [
                    'ffmpeg', '-y',
                    '-i', temp_video,
                    '-vf', f"subtitles='{ass_escaped}'",
                    '-c:v', 'libx264',
                    '-preset', 'fast',
                    '-crf', '18',
                    '-c:a', 'copy',
                    output_path
                ]
                subprocess.run(cmd, check=True, capture_output=True)
        else:
            # No subtitles - just copy
            import shutil
            shutil.move(temp_video, output_path)
        
        # Cleanup
        if os.path.exists(temp_video):
            os.remove(temp_video)
        
        report(1.0, "Complete!")
        
        processing_time = int((time.time() - start_timestamp) * 1000)
        
        return {
            'output_path': output_path,
            'speakers_detected': num_speakers,
            'layout_mode': layout_mode,
            'processing_time_ms': processing_time,
            'subtitle_path': ass_path
        }
    
    def _single_speaker_filter(
        self,
        width: int,
        height: int
    ) -> str:
        """Generate FFmpeg filter for single speaker center crop"""
        # Target 9:16 aspect ratio
        target_w = 1080
        target_h = 1920
        
        # Calculate crop from source
        source_aspect = width / height
        target_aspect = target_w / target_h
        
        if source_aspect > target_aspect:
            # Source is wider - crop sides
            crop_h = height
            crop_w = int(height * target_aspect)
            crop_x = (width - crop_w) // 2
            crop_y = 0
        else:
            # Source is taller - crop top/bottom
            crop_w = width
            crop_h = int(width / target_aspect)
            crop_x = 0
            crop_y = (height - crop_h) // 2
        
        return (
            f"[0:v]crop={crop_w}:{crop_h}:{crop_x}:{crop_y},"
            f"scale={target_w}:{target_h}[v]"
        )

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='SmartClip Engine')
    parser.add_argument('input', help='Input video file')
    parser.add_argument('-o', '--output', help='Output video file')
    parser.add_argument('-s', '--start', type=float, default=0, help='Start time (seconds)')
    parser.add_argument('-e', '--end', type=float, default=300, help='End time (seconds)')
    parser.add_argument('--subtitles', default='chris_cinematic', help='Subtitle style')
    parser.add_argument('--whisper', default='base', help='Whisper model')
    parser.add_argument('--no-subtitles', action='store_true', help='Disable subtitles')
    
    args = parser.parse_args()
    
    output = args.output or 'output/processed.mp4'
    
    engine = SmartClipEngine()
    result = engine.process(
        input_path=args.input,
        output_path=output,
        start_time=args.start,
        end_time=args.end,
        subtitle_style=None if args.no_subtitles else args.subtitles,
        whisper_model=args.whisper
    )
    
    print(f"\nDone!")
    print(f"   Output: {result['output_path']}")
    print(f"   Speakers: {result['speakers_detected']}")
    print(f"   Mode: {result['layout_mode']}")
    print(f"   Time: {result['processing_time_ms']}ms")
