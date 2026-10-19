<?php

namespace Tests\Feature;

use App\Models\Message;
use App\Models\PinnedChatMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PhaseThreeTest extends TestCase
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
            'body'        => 'Pesan penting yang disematkan',
            'status'      => 'sent',
        ]);
    }

    public function test_user_can_pin_and_unpin_chat_message(): void
    {
        // 1. Pin the message
        $response = $this->actingAs($this->user1, 'sanctum')
            ->postJson('/api/pinned-messages/toggle', [
                'chat_type'  => 'direct',
                'target_id'  => $this->user2->id,
                'message_id' => $this->message->id,
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'is_pinned'  => true,
            'message_id' => $this->message->id,
        ]);

        $this->assertDatabaseHas('pinned_chat_messages', [
            'chat_type'  => 'direct',
            'message_id' => $this->message->id,
        ]);

        // 2. Fetch pinned messages
        $listResponse = $this->actingAs($this->user2, 'sanctum')
            ->getJson('/api/pinned-messages?chat_type=direct&target_id=' . $this->user1->id);

        $listResponse->assertStatus(200);
        $listResponse->assertJsonCount(1, 'pinned_messages');

        // 3. Unpin via toggle
        $unpinResponse = $this->actingAs($this->user2, 'sanctum')
            ->postJson('/api/pinned-messages/toggle', [
                'chat_type'  => 'direct',
                'target_id'  => $this->user1->id,
                'message_id' => $this->message->id,
            ]);

        $unpinResponse->assertStatus(200);
        $unpinResponse->assertJson([
            'is_pinned' => false,
        ]);

        $this->assertDatabaseMissing('pinned_chat_messages', [
            'chat_type'  => 'direct',
            'message_id' => $this->message->id,
        ]);
    }

    public function test_user_can_manage_active_sessions(): void
    {
        // Create 2 tokens
        $token1 = $this->user1->createToken('Chrome di Windows');
        $token2 = $this->user1->createToken('Safari di iPhone');

        // Authenticate with token 1
        $response = $this->withHeader('Authorization', 'Bearer ' . $token1->plainTextToken)
            ->getJson('/api/auth/sessions');

        $response->assertStatus(200);
        $response->assertJsonCount(2, 'sessions');

        // Revoke token 2 specifically
        $tokenId2 = $token2->accessToken->id;
        $delResponse = $this->withHeader('Authorization', 'Bearer ' . $token1->plainTextToken)
            ->deleteJson('/api/auth/sessions/' . $tokenId2);

        $delResponse->assertStatus(200);
        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $tokenId2,
        ]);

        // Create another token and test revoke-others
        $token3 = $this->user1->createToken('Firefox di Linux');
        $this->assertEquals(2, $this->user1->tokens()->count());

        $revokeOthersResponse = $this->withHeader('Authorization', 'Bearer ' . $token1->plainTextToken)
            ->postJson('/api/auth/sessions/revoke-others');

        $revokeOthersResponse->assertStatus(200);
        $this->assertEquals(1, $this->user1->tokens()->count());
        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $token1->accessToken->id,
        ]);
    }
}
