<?php

namespace Tests\Feature;

use App\Models\ChatPreference;
use App\Models\Message;
use App\Models\MessageReaction;
use App\Models\StarredMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NewChatFeaturesTest extends TestCase
{
    use RefreshDatabase;

    protected User $user1;
    protected User $user2;
    protected Message $message;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user1 = User::factory()->create([
            'username'     => 'user1',
            'display_name' => 'User One',
        ]);

        $this->user2 = User::factory()->create([
            'username'     => 'user2',
            'display_name' => 'User Two',
        ]);

        $this->message = Message::create([
            'client_uuid' => (string) \Illuminate\Support\Str::uuid(),
            'sender_id'   => $this->user1->id,
            'receiver_id' => $this->user2->id,
            'body'        => 'Halo ini pesan uji coba',
            'status'      => 'sent',
        ]);
    }

    public function test_user_can_toggle_reaction_on_message(): void
    {
        $response = $this->actingAs($this->user2, 'sanctum')
            ->postJson('/api/reactions/toggle', [
                'message_type' => 'direct',
                'message_id'   => $this->message->id,
                'emoji'        => '👍',
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'message_type' => 'direct',
            'message_id'   => $this->message->id,
            'reactions'    => [
                '👍' => ['User Two'],
            ],
        ]);

        $this->assertDatabaseHas('message_reactions', [
            'message_type' => 'direct',
            'message_id'   => $this->message->id,
            'user_id'      => $this->user2->id,
            'emoji'        => '👍',
        ]);

        // Toggle off
        $response2 = $this->actingAs($this->user2, 'sanctum')
            ->postJson('/api/reactions/toggle', [
                'message_type' => 'direct',
                'message_id'   => $this->message->id,
                'emoji'        => '👍',
            ]);

        $response2->assertStatus(200);
        $response2->assertJson([
            'reactions' => [],
        ]);

        $this->assertDatabaseMissing('message_reactions', [
            'message_type' => 'direct',
            'message_id'   => $this->message->id,
            'user_id'      => $this->user2->id,
            'emoji'        => '👍',
        ]);
    }

    public function test_user_can_pin_and_unpin_chat(): void
    {
        $response = $this->actingAs($this->user1, 'sanctum')
            ->postJson('/api/chat-preferences/pin', [
                'target_type' => 'direct',
                'target_id'   => $this->user2->id,
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'is_pinned'   => true,
            'target_type' => 'direct',
            'target_id'   => $this->user2->id,
        ]);

        $this->assertDatabaseHas('chat_preferences', [
            'user_id'   => $this->user1->id,
            'chat_type' => 'direct',
            'target_id' => $this->user2->id,
            'is_pinned' => true,
        ]);

        // Toggle unpin
        $response2 = $this->actingAs($this->user1, 'sanctum')
            ->postJson('/api/chat-preferences/pin', [
                'target_type' => 'direct',
                'target_id'   => $this->user2->id,
            ]);

        $response2->assertStatus(200);
        $response2->assertJson([
            'is_pinned' => false,
        ]);
    }

    public function test_user_can_mute_and_unmute_chat(): void
    {
        $response = $this->actingAs($this->user1, 'sanctum')
            ->postJson('/api/chat-preferences/mute', [
                'target_type' => 'direct',
                'target_id'   => $this->user2->id,
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'is_muted'    => true,
            'target_type' => 'direct',
            'target_id'   => $this->user2->id,
        ]);

        // Index preferences check
        $indexResponse = $this->actingAs($this->user1, 'sanctum')
            ->getJson('/api/chat-preferences');

        $indexResponse->assertStatus(200);
        $indexResponse->assertJson([
            'muted_direct_ids' => [$this->user2->id],
        ]);
    }

    public function test_user_can_star_and_unstar_message(): void
    {
        $response = $this->actingAs($this->user1, 'sanctum')
            ->postJson('/api/starred-messages/toggle', [
                'message_type' => 'direct',
                'message_id'   => $this->message->id,
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'is_starred'   => true,
            'message_type' => 'direct',
            'message_id'   => $this->message->id,
        ]);

        $this->assertDatabaseHas('starred_messages', [
            'user_id'      => $this->user1->id,
            'message_type' => 'direct',
            'message_id'   => $this->message->id,
        ]);

        // Get starred messages
        $listResponse = $this->actingAs($this->user1, 'sanctum')
            ->getJson('/api/starred-messages');

        $listResponse->assertStatus(200);
        $listResponse->assertJsonCount(1, 'starred');
    }
}
